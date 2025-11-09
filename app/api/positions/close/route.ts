// app/api/positions/close/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { closePositionData, collectFeesData } from '@/lib/uniswap/positions'
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
    const { positionId, collectFees = true } = body

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

    // Collect fees if requested
    let totalFeesUSD = 0
    if (collectFees) {
      const feesData = await collectFeesData({
        positionId: position.position_id,
        poolAddress: position.pool_address,
        token0Address: position.token0_address,
        token1Address: position.token1_address,
      })

      // Convert fees to USD
      const token0Price = await fetchCryptoPrice(position.token0_symbol)
      const token1Price = await fetchCryptoPrice(position.token1_symbol)

      const token0FeesUSD = parseFloat(feesData.token0Fees) * (token0Price || 0)
      const token1FeesUSD = parseFloat(feesData.token1Fees) * (token1Price || 0)
      totalFeesUSD = token0FeesUSD + token1FeesUSD
    }

    // Close position using Uniswap SDK
    const closeData = await closePositionData({
      positionId: position.position_id,
      poolAddress: position.pool_address,
      token0Address: position.token0_address,
      token1Address: position.token1_address,
      collectFees,
    })

    // Convert returned tokens to USD
    const token0Price = await fetchCryptoPrice(position.token0_symbol)
    const token1Price = await fetchCryptoPrice(position.token1_symbol)

    const token0AmountUSD = parseFloat(closeData.token0Amount) * (token0Price || 0)
    const token1AmountUSD = parseFloat(closeData.token1Amount) * (token1Price || 0)
    const totalReturnUSD = token0AmountUSD + token1AmountUSD + totalFeesUSD

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
    const newBalance = currentBalance + totalReturnUSD

    await query(
      `UPDATE users 
       SET balance_usd = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, userId]
    )

    // Close position
    await query(
      `UPDATE user_positions 
       SET status = 'closed', 
           closed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [positionId]
    )

    // Log transaction
    await query(
      `INSERT INTO transactions (user_id, type, amount_usd, status, metadata)
       VALUES ($1, 'position_close', $2, 'completed', $3)`,
      [
        userId,
        totalReturnUSD,
        JSON.stringify({
          positionId: position.id,
          originalAmount: position.amount_usd,
          returnedAmount: totalReturnUSD,
          feesCollected: totalFeesUSD,
          token0Amount: closeData.token0Amount,
          token1Amount: closeData.token1Amount,
        }),
      ]
    )

    return NextResponse.json(
      {
        message: 'Position closed successfully',
        returnedAmount: totalReturnUSD,
        feesCollected: totalFeesUSD,
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

