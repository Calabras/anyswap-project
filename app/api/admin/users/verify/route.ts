// app/api/admin/users/verify/route.ts
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
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    await query(
      `UPDATE users 
       SET email_verified = TRUE, 
           email_verification_code = NULL,
           email_verification_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    )

    return NextResponse.json(
      { message: 'Email verified successfully' },
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

