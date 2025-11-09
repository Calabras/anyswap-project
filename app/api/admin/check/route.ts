// app/api/admin/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { sanitizeError } from '@/lib/security/errors'

export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    let token: string | null = null
    
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // Try to get from cookie (for client-side requests)
      const cookieHeader = req.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {} as Record<string, string>)
        token = cookies['authToken'] || null
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized', isAdmin: false },
        { status: 401 }
      )
    }
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret || jwtSecret.length < 32) {
      return NextResponse.json(
        { message: 'Server configuration error', isAdmin: false },
        { status: 500 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    
    // Check if user is admin
    const result = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found', isAdmin: false },
        { status: 404 }
      )
    }

    const isAdmin = result.rows[0].is_admin === true

    return NextResponse.json(
      { isAdmin },
      { status: 200 }
    )
  } catch (error: unknown) {
    const sanitized = sanitizeError(error)
    return NextResponse.json(
      { message: sanitized.message, isAdmin: false },
      { status: sanitized.status }
    )
  }
}

