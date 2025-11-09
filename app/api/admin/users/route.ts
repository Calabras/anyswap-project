// app/api/admin/users/route.ts
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

export async function GET(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await query(
      `SELECT 
        id, 
        email, 
        wallet_address, 
        nickname, 
        balance_usd, 
        email_verified, 
        created_at, 
        last_login_at, 
        ip_address, 
        is_banned, 
        auth_type
       FROM users 
       ORDER BY created_at DESC`
    )

    return NextResponse.json(
      { users: result.rows },
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

