// app/api/pools/update/route.ts
// API endpoint to update pool data from Uniswap

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Get pool from database via Prisma
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
    })

    if (!pool) {
      return NextResponse.json(
        { message: 'Pool not found' },
        { status: 404 }
      )
    }

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
    const poolData = await fetchUniswapPoolData(pool.address, graphNetwork)

    if (!poolData) {
      return NextResponse.json(
        { message: 'Failed to fetch pool data from Uniswap' },
        { status: 500 }
      )
    }

    // Update pool in database via Prisma
    await prisma.pool.update({
      where: { id: poolId },
      data: {
        token0Symbol: poolData.token0.symbol,
        token1Symbol: poolData.token1.symbol,
        token0Address: poolData.token0.address,
        token1Address: poolData.token1.address,
        fee: poolData.feeTier,
        tvlUSD: poolData.tvl,
        volumeUSD: poolData.volume24h,
        updatedAt: new Date(),
      },
    })

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
    // Get all active pools via Prisma
    const pools = await prisma.pool.findMany({
      where: { isActive: true },
      select: { id: true, address: true, network: true },
    })

    const updatedPools: any[] = []
    const failedPools: any[] = []

    for (const pool of pools) {
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
        const poolData = await fetchUniswapPoolData(pool.address, graphNetwork)

        if (poolData) {
          // Update in database via Prisma
          await prisma.pool.update({
            where: { id: pool.id },
            data: {
              token0Symbol: poolData.token0.symbol,
              token1Symbol: poolData.token1.symbol,
              token0Address: poolData.token0.address,
              token1Address: poolData.token1.address,
              fee: poolData.feeTier,
              tvlUSD: poolData.tvl,
              volumeUSD: poolData.volume24h,
              updatedAt: new Date(),
            },
          })

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

