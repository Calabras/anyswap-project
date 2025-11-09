// app/api/positions/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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

    // Get pool data
    const poolResult = await query(
      `SELECT id, pool_address, network, token0_symbol, token1_symbol, 
              token0_address, token1_address, fee_tier, tvl_usd, apr
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

    // Get user balance
    const userResult = await query(
      'SELECT balance_usd FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const userBalance = parseFloat(userResult.rows[0].balance_usd)

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
      poolAddress: pool.pool_address,
      token0Address: pool.token0_address,
      token1Address: pool.token1_address,
      token0Symbol: pool.token0_symbol,
      token1Symbol: pool.token1_symbol,
      token0Decimals: 18, // Default, should be fetched from token contract
      token1Decimals: 18, // Default, should be fetched from token contract
      feeTier: pool.fee_tier,
      amountUSD: parseFloat(amountUSD),
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isFullRange: isFullRange || false,
      currentPrice,
    })

    // Deduct amount from user balance
    const newBalance = userBalance - parseFloat(amountUSD)

    await query(
      `UPDATE users 
       SET balance_usd = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, userId]
    )

    // Create position record
    const positionResult = await query(
      `INSERT INTO user_positions (
        user_id, pool_id, position_id, amount_usd, 
        min_price, max_price, is_full_range, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, position_id, amount_usd, created_at`,
      [
        userId,
        poolId,
        positionData.positionId,
        parseFloat(amountUSD),
        minPrice ? parseFloat(minPrice) : null,
        maxPrice ? parseFloat(maxPrice) : null,
        isFullRange || false,
      ]
    )

    const position = positionResult.rows[0]

    // Log transaction
    await query(
      `INSERT INTO transactions (user_id, type, amount_usd, status, metadata)
       VALUES ($1, 'position_open', $2, 'completed', $3)`,
      [
        userId,
        parseFloat(amountUSD),
        JSON.stringify({
          poolId,
          positionId: positionData.positionId,
          tickLower: positionData.tickLower,
          tickUpper: positionData.tickUpper,
          isFullRange,
        }),
      ]
    )

    return NextResponse.json(
      {
        message: 'Position created successfully',
        position: {
          id: position.id,
          positionId: position.position_id,
          amountUSD: position.amount_usd,
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

