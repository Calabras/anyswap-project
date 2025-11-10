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

    // Get position
    const positionResult = await query(
      `SELECT up.id, up.user_id, up.pool_id, up.position_id, up.amount_usd,
              up.collected_fees_usd, up.status,
              lp.pool_address, lp.token0_address, lp.token1_address,
              lp.token0_symbol, lp.token1_symbol
       FROM user_positions up
       JOIN liquidity_pools lp ON up.pool_id = lp.id
       WHERE up.id = $1 AND up.user_id = $2 AND up.status = 'active'`,
      [positionId, userId]
    )

    if (positionResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Position not found or not active' },
        { status: 404 }
      )
    }

    const position = positionResult.rows[0]

    // Collect fees using Uniswap SDK
    const feesData = await collectFeesData({
      positionId: position.position_id,
      poolAddress: position.pool_address,
      token0Address: position.token0_address,
      token1Address: position.token1_address,
    })

    // Convert fees to USD using Binance API
    let feesUSD = feesData.feesUSD

    if (feesUSD === 0) {
      // Calculate fees from token amounts
      const token0Price = await fetchCryptoPrice(position.token0_symbol)
      const token1Price = await fetchCryptoPrice(position.token1_symbol)

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

    // Update user balance
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

    const currentBalance = parseFloat(userResult.rows[0].balance_usd)
    const newBalance = currentBalance + feesUSD

    await query(
      `UPDATE users 
       SET balance_usd = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, userId]
    )

    // Update position's collected fees
    const newCollectedFees = parseFloat(position.collected_fees_usd || '0') + feesUSD

    await query(
      `UPDATE user_positions 
       SET collected_fees_usd = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newCollectedFees, positionId]
    )

    // Log transaction
    await query(
      `INSERT INTO transactions (user_id, type, amount_usd, status, metadata)
       VALUES ($1, 'fee_collection', $2, 'completed', $3)`,
      [
        userId,
        feesUSD,
        JSON.stringify({
          positionId: position.id,
          token0Fees: feesData.token0Fees,
          token1Fees: feesData.token1Fees,
        }),
      ]
    )

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

