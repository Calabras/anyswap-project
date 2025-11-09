// app/api/admin/payment-systems/route.ts
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

    const result = await query(
      'SELECT id, name, type, is_active, created_at FROM payment_systems ORDER BY name'
    )

    return NextResponse.json(
      { systems: result.rows },
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

export async function PUT(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { id, name, api_key, api_secret } = body

    if (!id || !name) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    await query(
      `UPDATE payment_systems 
       SET name = $1, 
           api_key = COALESCE($2, api_key),
           api_secret = COALESCE($3, api_secret),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [name, api_key || null, api_secret || null, id]
    )

    return NextResponse.json(
      { message: 'Payment system updated successfully' },
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

    await query('DELETE FROM payment_systems WHERE id = $1', [id])

    return NextResponse.json(
      { message: 'Payment system deleted successfully' },
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

