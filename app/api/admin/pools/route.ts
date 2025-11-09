// app/api/admin/pools/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sanitizeError } from '@/lib/security/errors'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret || jwtSecret.length < 32) {
    return null
  }

  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    const result = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return null
    }

    return decoded.userId
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const network = searchParams.get('network')

    let result
    if (network && network !== 'all') {
      result = await query(
        'SELECT * FROM liquidity_pools WHERE network = $1 AND is_active = TRUE ORDER BY tvl_usd DESC',
        [network]
      )
    } else {
      result = await query(
        'SELECT * FROM liquidity_pools WHERE is_active = TRUE ORDER BY tvl_usd DESC'
      )
    }

    return NextResponse.json(
      { pools: result.rows },
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

export async function POST(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { uniswapUrl } = body

    if (!uniswapUrl) {
      return NextResponse.json(
        { message: 'Uniswap URL is required' },
        { status: 400 }
      )
    }

    // Parse Uniswap URL and fetch pool data via Uniswap API
    const { parseUniswapUrl, fetchPoolFromUrl } = await import('@/lib/uniswap/api')
    
    // First, verify URL can be parsed
    const parsed = parseUniswapUrl(uniswapUrl)
    if (!parsed) {
      return NextResponse.json(
        { message: 'Invalid Uniswap URL format. Expected: https://app.uniswap.org/explore/pools/{network}/{pool_address} or https://app.uniswap.org/pools/{pool_address}' },
        { status: 400 }
      )
    }
    
    let poolData
    try {
      poolData = await fetchPoolFromUrl(uniswapUrl)
    } catch (error: any) {
      console.error('Error fetching pool data:', error)
      return NextResponse.json(
        { message: error.message || 'Failed to fetch pool data from Uniswap API' },
        { status: 400 }
      )
    }

    if (!poolData) {
      return NextResponse.json(
        { message: `Failed to fetch pool data from Uniswap. Pool ${parsed.poolAddress} not found on ${parsed.network} network. Please verify the pool address and network.` },
        { status: 400 }
      )
    }

    // Check if pool already exists
    const existingPool = await query(
      'SELECT id FROM liquidity_pools WHERE pool_address = $1',
      [poolData.poolAddress]
    )

    if (existingPool.rows.length > 0) {
      return NextResponse.json(
        { message: 'Pool already exists' },
        { status: 409 }
      )
    }

    // Insert pool with data from Uniswap API
    const result = await query(
      `INSERT INTO liquidity_pools (
        pool_address, 
        network, 
        token0_symbol, 
        token1_symbol, 
        token0_address, 
        token1_address, 
        fee_tier, 
        tvl_usd, 
        volume_24h_usd, 
        fees_24h_usd, 
        apr, 
        uniswap_url,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
      RETURNING *`,
      [
        poolData.poolAddress,
        poolData.network,
        poolData.token0.symbol,
        poolData.token1.symbol,
        poolData.token0.address,
        poolData.token1.address,
        poolData.feeTier,
        poolData.tvl,
        poolData.volume24h,
        poolData.fees24h,
        poolData.apr,
        uniswapUrl,
      ]
    )

    return NextResponse.json(
      { 
        message: 'Pool added successfully with real-time data from Uniswap',
        pool: result.rows[0],
        poolData,
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

export async function DELETE(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Soft delete - set is_active to false
    await query(
      'UPDATE liquidity_pools SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )

    return NextResponse.json(
      { message: 'Pool deleted successfully' },
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

