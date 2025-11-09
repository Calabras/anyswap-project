// app/api/positions/list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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

    // Get user positions
    const positionsResult = await query(
      `SELECT 
        up.id,
        up.position_id,
        up.amount_usd,
        up.min_price,
        up.max_price,
        up.is_full_range,
        up.collected_fees_usd,
        up.status,
        up.created_at,
        up.updated_at,
        up.closed_at,
        lp.id as pool_id,
        lp.pool_address,
        lp.network,
        lp.token0_symbol,
        lp.token1_symbol,
        lp.fee_tier,
        lp.tvl_usd,
        lp.apr
       FROM user_positions up
       JOIN liquidity_pools lp ON up.pool_id = lp.id
       WHERE up.user_id = $1 AND up.status = $2
       ORDER BY up.created_at DESC`,
      [userId, status]
    )

    const positions = positionsResult.rows.map((row) => ({
      id: row.id,
      positionId: row.position_id,
      poolId: row.pool_id,
      poolAddress: row.pool_address,
      network: row.network,
      token0Symbol: row.token0_symbol,
      token1Symbol: row.token1_symbol,
      feeTier: row.fee_tier,
      amountUSD: parseFloat(row.amount_usd),
      minPrice: row.min_price ? parseFloat(row.min_price) : null,
      maxPrice: row.max_price ? parseFloat(row.max_price) : null,
      isFullRange: row.is_full_range,
      collectedFeesUSD: parseFloat(row.collected_fees_usd || '0'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
      poolTVL: parseFloat(row.tvl_usd || '0'),
      poolAPR: parseFloat(row.apr || '0'),
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

