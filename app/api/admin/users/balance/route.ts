// app/api/admin/users/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
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
    const { userId, amount, action } = body

    if (!userId || !amount || !action) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action !== 'add' && action !== 'subtract') {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get current balance
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
    const newBalance = action === 'add' 
      ? currentBalance + parseFloat(amount)
      : Math.max(0, currentBalance - parseFloat(amount))

    // Update balance
    await query(
      `UPDATE users 
       SET balance_usd = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newBalance, userId]
    )

    // Log transaction
    await query(
      `INSERT INTO transactions (user_id, type, amount_usd, status, payment_method, metadata)
       VALUES ($1, 'deposit', $2, 'completed', 'admin', $3)`,
      [
        userId,
        action === 'add' ? parseFloat(amount) : -parseFloat(amount),
        JSON.stringify({ action, adminId, reason: 'admin_balance_adjustment' })
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

