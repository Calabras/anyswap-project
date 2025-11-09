// app/api/pools/route.ts
// API endpoint to get pools for main page

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { sanitizeError } from '@/lib/security/errors'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const network = searchParams.get('network')
    const tvlMin = searchParams.get('tvlMin')
    const tvlMax = searchParams.get('tvlMax')
    const feeMin = searchParams.get('feeMin')
    const feeMax = searchParams.get('feeMax')
    const aprMin = searchParams.get('aprMin')
    const aprMax = searchParams.get('aprMax')

    // Build query with filters
    let sql = 'SELECT * FROM liquidity_pools WHERE is_active = TRUE'
    const params: any[] = []
    let paramIndex = 1

    if (network && network !== 'all') {
      sql += ` AND network = $${paramIndex}`
      params.push(network)
      paramIndex++
    }

    if (tvlMin) {
      sql += ` AND tvl_usd >= $${paramIndex}`
      params.push(parseFloat(tvlMin))
      paramIndex++
    }

    if (tvlMax) {
      sql += ` AND tvl_usd <= $${paramIndex}`
      params.push(parseFloat(tvlMax))
      paramIndex++
    }

    if (feeMin) {
      sql += ` AND fees_24h_usd >= $${paramIndex}`
      params.push(parseFloat(feeMin))
      paramIndex++
    }

    if (feeMax) {
      sql += ` AND fees_24h_usd <= $${paramIndex}`
      params.push(parseFloat(feeMax))
      paramIndex++
    }

    if (aprMin) {
      sql += ` AND apr >= $${paramIndex}`
      params.push(parseFloat(aprMin))
      paramIndex++
    }

    if (aprMax) {
      sql += ` AND apr <= $${paramIndex}`
      params.push(parseFloat(aprMax))
      paramIndex++
    }

    sql += ' ORDER BY tvl_usd DESC'

    const result = await query(sql, params)

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

