// app/api/positions/close/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { closePositionData, collectFeesData } from '@/lib/uniswap/positions'
import { fetchCryptoPrice } from '@/lib/binance/api'
import { validateBodySize } from '@/lib/security/validation'
import { sanitizeError } from '@/lib/security/errors'

export async function POST(req: NextRequest) {
  try {
    // Validate request body size
    const bodyText = await req.text()
    if (!validateBodySize(bodyText, 1024)) {
      return NextResponse.json(
        { message: 'Request body too large' },
        { status: 413 }
      )
    }

    // Get token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret || jwtSecret.length < 32) {
      return NextResponse.json(
        { message: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    const userId = decoded.userId

    const body = JSON.parse(bodyText)
    const { positionId, collectFees = true } = body

    if (!positionId) {
      return NextResponse.json(
        { message: 'Position ID is required' },
        { status: 400 }
      )
    }

    // Get position via Prisma
    const position = await prisma.position.findFirst({
      where: {
        id: positionId,
        userId,
        status: 'ACTIVE',
      },
      include: { pool: true },
    })

    if (!position || !position.pool) {
      return NextResponse.json(
        { message: 'Position not found or not active' },
        { status: 404 }
      )
    }

    // Collect fees if requested
    let totalFeesUSD = 0
    if (collectFees) {
      const feesData = await collectFeesData({
        positionId: position.tokenId || '',
        poolAddress: position.pool.address,
        token0Address: position.pool.token0Address,
        token1Address: position.pool.token1Address,
      })

      // Convert fees to USD
      const token0Price = await fetchCryptoPrice(position.pool.token0Symbol)
      const token1Price = await fetchCryptoPrice(position.pool.token1Symbol)

      const token0FeesUSD = parseFloat(feesData.token0Fees) * (token0Price || 0)
      const token1FeesUSD = parseFloat(feesData.token1Fees) * (token1Price || 0)
      totalFeesUSD = token0FeesUSD + token1FeesUSD
    }

    // Close position using Uniswap SDK
    const closeData = await closePositionData({
      positionId: position.tokenId || '',
      poolAddress: position.pool.address,
      token0Address: position.pool.token0Address,
      token1Address: position.pool.token1Address,
      collectFees,
    })

    // Convert returned tokens to USD
    const token0Price = await fetchCryptoPrice(position.pool.token0Symbol)
    const token1Price = await fetchCryptoPrice(position.pool.token1Symbol)

    const token0AmountUSD = parseFloat(closeData.token0Amount) * (token0Price || 0)
    const token1AmountUSD = parseFloat(closeData.token1Amount) * (token1Price || 0)
    const totalReturnUSD = token0AmountUSD + token1AmountUSD + totalFeesUSD

    // Update user balance via Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balanceUsd: true },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const currentBalance = parseFloat(user.balanceUsd.toString())
    const newBalance = currentBalance + totalReturnUSD

    await prisma.user.update({
      where: { id: userId },
      data: { balanceUsd: newBalance },
    })

    // Close position
    await prisma.position.update({
      where: { id: positionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    })

    // Log transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'REMOVE_LIQUIDITY',
        status: 'CONFIRMED',
        network: position.pool.network,
        amount: totalReturnUSD.toString(),
        amountUSD: totalReturnUSD,
        metadata: {
          positionId: position.id,
          returnedAmount: totalReturnUSD,
          feesCollected: totalFeesUSD,
          token0Amount: closeData.token0Amount,
          token1Amount: closeData.token1Amount,
        } as any,
      },
    })

    return NextResponse.json(
      {
        message: 'Position closed successfully',
        returnedAmount: totalReturnUSD,
        feesCollected: totalFeesUSD,
        newBalance,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const sanitized = sanitizeError(error)
    return NextResponse.json(
      { message: sanitized.message },
      { status: sanitized.status }
    )
  }
}

