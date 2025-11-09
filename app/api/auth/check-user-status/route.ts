// app/api/auth/check-user-status/route.ts
// Check if user exists and is verified (for unified auth flow)

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { isValidEmail, validateBodySize } from '@/lib/security/validation'
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
    
    const body = JSON.parse(bodyText)
    const { email } = body

    // Validate email format
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const result = await query(
      'SELECT id, email, email_verified FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          exists: false,
          emailVerified: false,
        },
        { status: 200 }
      )
    }

    const user = result.rows[0]

    return NextResponse.json(
      { 
        exists: true,
        emailVerified: user.email_verified || false,
        userId: user.id,
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

