// app/api/positions/list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { sanitizeError } from '@/lib/security/errors'

export async function GET(req: NextRequest) {
  try {
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

    // Get status filter from query params
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'active'

    // Get user positions via Prisma
    const prismaStatus =
      status === 'closed'
        ? 'CLOSED'
        : status === 'pending'
        ? 'PENDING'
        : 'ACTIVE'

    const userPositions = await prisma.position.findMany({
      where: {
        userId,
        status: prismaStatus as any,
      },
      include: {
        pool: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const positions = userPositions.map((p) => ({
      id: p.id,
      positionId: p.tokenId || '',
      poolId: p.poolId,
      poolAddress: p.pool?.address || '',
      network: p.pool?.network || 'mainnet',
      token0Symbol: p.pool?.token0Symbol || '',
      token1Symbol: p.pool?.token1Symbol || '',
      feeTier: p.pool?.fee || 0,
      amountUSD: typeof p.amount0 === 'string' || typeof p.amount1 === 'string' ? 0 : 0, // placeholder, amounts are string units
      minPrice: null,
      maxPrice: null,
      isFullRange: p.tickLower <= -887220 && p.tickUpper >= 887220,
      collectedFeesUSD: 0, // derive later from collectedFees0/1 and prices
      status: p.status.toString().toLowerCase(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      closedAt: p.closedAt ? p.closedAt.toISOString() : null,
      poolTVL: p.pool?.tvlUSD || 0,
      poolAPR: 0,
    }))

    return NextResponse.json(
      { positions },
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

