// app/api/deposit/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { sanitizeError } from '@/lib/security/errors'

export async function POST(req: NextRequest) {
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
    
    const body = await req.json()
    const { amount } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { message: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Get current balance
    const userResult = await query(
      'SELECT balance_usd FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const currentBalance = parseFloat(userResult.rows[0].balance_usd)
    const newBalance = currentBalance + parseFloat(amount)

    // Update balance
    await query(
      `UPDATE users 
       SET balance_usd = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, decoded.userId]
    )

    // Log transaction
    await query(
      `INSERT INTO transactions (user_id, type, amount_usd, status, payment_method, metadata)
       VALUES ($1, 'deposit', $2, 'completed', 'test', $3)`,
      [
        decoded.userId,
        parseFloat(amount),
        JSON.stringify({ test: true })
      ]
    )

    return NextResponse.json(
      { message: 'Balance updated successfully', newBalance },
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

