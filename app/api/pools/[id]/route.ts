// app/api/pools/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sanitizeError } from '@/lib/security/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id

    if (!poolId) {
      return NextResponse.json(
        { message: 'Pool ID is required' },
        { status: 400 }
      )
    }

    // Get pool from database
    const poolResult = await query(
      `SELECT 
        id, pool_address, network, token0_symbol, token1_symbol,
        token0_address, token1_address, fee_tier, tvl_usd,
        volume_24h_usd, fees_24h_usd, apr, uniswap_url, created_at, updated_at
       FROM liquidity_pools 
       WHERE id = $1 AND is_active = TRUE`,
      [poolId]
    )

    if (poolResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Pool not found' },
        { status: 404 }
      )
    }

    const pool = poolResult.rows[0]

    // Calculate current price (simplified - should fetch from Uniswap)
    // For now, we'll use a default calculation
    const currentPrice = 1 // This should be fetched from Uniswap pool state

    return NextResponse.json(
      {
        pool: {
          id: pool.id,
          poolAddress: pool.pool_address,
          network: pool.network,
          token0: {
            symbol: pool.token0_symbol,
            address: pool.token0_address,
          },
          token1: {
            symbol: pool.token1_symbol,
            address: pool.token1_address,
          },
          feeTier: pool.fee_tier,
          tvl: parseFloat(pool.tvl_usd || '0'),
          volume24h: parseFloat(pool.volume_24h_usd || '0'),
          fees24h: parseFloat(pool.fees_24h_usd || '0'),
          apr: parseFloat(pool.apr || '0'),
          currentPrice,
          uniswapUrl: pool.uniswap_url,
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

