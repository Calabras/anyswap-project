// app/api/positions/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { createPositionData } from '@/lib/uniswap/positions'
import { fetchCryptoPrice } from '@/lib/binance/api'
import { validateBodySize, getClientIP } from '@/lib/security/validation'
import { sanitizeError } from '@/lib/security/errors'

export async function POST(req: NextRequest) {
  try {
    // Validate request body size
    const bodyText = await req.text()
    if (!validateBodySize(bodyText, 2048)) {
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
    const {
      poolId,
      amountUSD,
      minPrice,
      maxPrice,
      isFullRange,
    } = body

    // Validate inputs
    if (!poolId || !amountUSD || parseFloat(amountUSD) <= 0) {
      return NextResponse.json(
        { message: 'Invalid pool ID or amount' },
        { status: 400 }
      )
    }

    if (!isFullRange && (!minPrice || !maxPrice || parseFloat(minPrice) <= 0 || parseFloat(maxPrice) <= 0)) {
      return NextResponse.json(
        { message: 'Price range is required when not using full range' },
        { status: 400 }
      )
    }

    // Get pool data via Prisma
    const pool = await prisma.pool.findFirst({
      where: { id: poolId, isActive: true },
    })

    if (!pool) {
      return NextResponse.json(
        { message: 'Pool not found' },
        { status: 404 }
      )
    }

    // Get user balance via Prisma
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

    const userBalance = parseFloat(user.balanceUsd.toString())

    if (userBalance < parseFloat(amountUSD)) {
      return NextResponse.json(
        { message: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Get current price (simplified - use pool's current price or fetch from Uniswap)
    // For now, we'll use a default calculation based on TVL
    const currentPrice = 1 // This should be fetched from Uniswap pool state

    // Create position data using Uniswap SDK logic
    const positionData = await createPositionData({
      poolAddress: pool.address,
      token0Address: pool.token0Address,
      token1Address: pool.token1Address,
      token0Symbol: pool.token0Symbol,
      token1Symbol: pool.token1Symbol,
      token0Decimals: 18, // Default, should be fetched from token contract
      token1Decimals: 18, // Default, should be fetched from token contract
      feeTier: pool.fee,
      amountUSD: parseFloat(amountUSD),
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isFullRange: isFullRange || false,
      currentPrice,
    })

    // Deduct amount from user balance
    const newBalance = userBalance - parseFloat(amountUSD)

    await prisma.user.update({
      where: { id: userId },
      data: { balanceUsd: newBalance },
    })

    // Create position record in Prisma schema
    const position = await prisma.position.create({
      data: {
        userId,
        poolId: pool.id,
        tokenId: positionData.positionId,
        tickLower: positionData.tickLower,
        tickUpper: positionData.tickUpper,
        liquidity: '0',
        amount0: '0',
        amount1: '0',
        status: 'ACTIVE',
      },
    })

    // Log transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'ADD_LIQUIDITY',
        status: 'CONFIRMED',
        network: pool.network,
        amount: amountUSD.toString(),
        amountUSD: parseFloat(amountUSD),
        metadata: {
          poolId,
          positionId: positionData.positionId,
          tickLower: positionData.tickLower,
          tickUpper: positionData.tickUpper,
          isFullRange,
        } as any,
      },
    })

    return NextResponse.json(
      {
        message: 'Position created successfully',
        position: {
          id: position.id,
          positionId: position.tokenId,
          amountUSD: parseFloat(amountUSD),
          tickLower: positionData.tickLower,
          tickUpper: positionData.tickUpper,
          priceLower: positionData.priceLower,
          priceUpper: positionData.priceUpper,
        },
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

