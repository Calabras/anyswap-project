// app/api/pools/update/route.ts
// API endpoint to update pool data from Uniswap

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { fetchUniswapPoolData } from '@/lib/uniswap/api'
import { sanitizeError } from '@/lib/security/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { poolId } = body

    if (!poolId) {
      return NextResponse.json(
        { message: 'Pool ID is required' },
        { status: 400 }
      )
    }

    // Get pool from database
    const poolResult = await query(
      'SELECT pool_address, network FROM liquidity_pools WHERE id = $1',
      [poolId]
    )

    if (poolResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Pool not found' },
        { status: 404 }
      )
    }

    const pool = poolResult.rows[0]
    
    // Map network back to The Graph format
    const networkMap: Record<string, string> = {
      'ERC20': 'ethereum',
      'POLYGON': 'polygon',
      'ARBITRUM': 'arbitrum',
      'OPTIMISM': 'optimism',
      'BASE': 'base',
    }

    const graphNetwork = networkMap[pool.network] || 'ethereum'

    // Fetch latest data from Uniswap
    const poolData = await fetchUniswapPoolData(pool.pool_address, graphNetwork)

    if (!poolData) {
      return NextResponse.json(
        { message: 'Failed to fetch pool data from Uniswap' },
        { status: 500 }
      )
    }

    // Update pool in database
    await query(
      `UPDATE liquidity_pools 
       SET 
         token0_symbol = $1,
         token1_symbol = $2,
         token0_address = $3,
         token1_address = $4,
         fee_tier = $5,
         tvl_usd = $6,
         volume_24h_usd = $7,
         fees_24h_usd = $8,
         apr = $9,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        poolData.token0.symbol,
        poolData.token1.symbol,
        poolData.token0.address,
        poolData.token1.address,
        poolData.feeTier,
        poolData.tvl,
        poolData.volume24h,
        poolData.fees24h,
        poolData.apr,
        poolId,
      ]
    )

    return NextResponse.json(
      { 
        message: 'Pool updated successfully',
        pool: poolData,
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

/**
 * Update all pools
 */
export async function PUT(req: NextRequest) {
  try {
    // Get all active pools
    const poolsResult = await query(
      'SELECT id, pool_address, network FROM liquidity_pools WHERE is_active = TRUE'
    )

    const updatedPools: any[] = []
    const failedPools: any[] = []

    for (const pool of poolsResult.rows) {
      try {
        // Map network
        const networkMap: Record<string, string> = {
          'ERC20': 'ethereum',
          'POLYGON': 'polygon',
          'ARBITRUM': 'arbitrum',
          'OPTIMISM': 'optimism',
          'BASE': 'base',
        }

        const graphNetwork = networkMap[pool.network] || 'ethereum'

        // Fetch latest data
        const poolData = await fetchUniswapPoolData(pool.pool_address, graphNetwork)

        if (poolData) {
          // Update in database
          await query(
            `UPDATE liquidity_pools 
             SET 
               token0_symbol = $1,
               token1_symbol = $2,
               token0_address = $3,
               token1_address = $4,
               fee_tier = $5,
               tvl_usd = $6,
               volume_24h_usd = $7,
               fees_24h_usd = $8,
               apr = $9,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $10`,
            [
              poolData.token0.symbol,
              poolData.token1.symbol,
              poolData.token0.address,
              poolData.token1.address,
              poolData.feeTier,
              poolData.tvl,
              poolData.volume24h,
              poolData.fees24h,
              poolData.apr,
              pool.id,
            ]
          )

          updatedPools.push({ id: pool.id, symbol: `${poolData.token0.symbol}/${poolData.token1.symbol}` })
        } else {
          failedPools.push({ id: pool.id, reason: 'Failed to fetch data' })
        }
      } catch (error: any) {
        failedPools.push({ id: pool.id, reason: error.message })
      }
    }

    return NextResponse.json(
      {
        message: `Updated ${updatedPools.length} pools`,
        updated: updatedPools,
        failed: failedPools,
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

