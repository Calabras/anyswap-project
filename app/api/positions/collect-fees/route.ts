// app/api/positions/collect-fees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { collectFeesData } from '@/lib/uniswap/positions'
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
    const { positionId } = body

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
      include: {
        pool: true,
      },
    })

    if (!position || !position.pool) {
      return NextResponse.json(
        { message: 'Position not found or not active' },
        { status: 404 }
      )
    }

    // Collect fees using Uniswap SDK
    const feesData = await collectFeesData({
      positionId: position.tokenId || '',
      poolAddress: position.pool.address,
      token0Address: position.pool.token0Address,
      token1Address: position.pool.token1Address,
    })

    // Convert fees to USD using Binance API
    let feesUSD = feesData.feesUSD

    if (feesUSD === 0) {
      // Calculate fees from token amounts
      const token0Price = await fetchCryptoPrice(position.pool.token0Symbol)
      const token1Price = await fetchCryptoPrice(position.pool.token1Symbol)

      const token0FeesUSD = parseFloat(feesData.token0Fees) * (token0Price || 0)
      const token1FeesUSD = parseFloat(feesData.token1Fees) * (token1Price || 0)
      feesUSD = token0FeesUSD + token1FeesUSD
    }

    if (feesUSD <= 0) {
      return NextResponse.json(
        { message: 'No fees to collect' },
        { status: 400 }
      )
    }

    // Update user balance (Prisma)
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
    const newBalance = currentBalance + feesUSD

    await prisma.user.update({
      where: { id: userId },
      data: { balanceUsd: newBalance },
    })

    // Optional: update collected fees fields on Position (we store per-token strings)
    // Here we just leave as-is since schema stores token amounts separately.

    // Log transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'COLLECT_FEES',
        status: 'CONFIRMED',
        network: position.pool.network,
        amount: feesUSD.toString(),
        amountUSD: feesUSD,
        metadata: {
          positionId: position.id,
          token0Fees: feesData.token0Fees,
          token1Fees: feesData.token1Fees,
        } as any,
      },
    })

    return NextResponse.json(
      {
        message: 'Fees collected successfully',
        feesUSD,
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

