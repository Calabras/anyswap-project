// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { isValidEmail, isValidVerificationCode, getClientIP, validateBodySize } from '@/lib/security/validation'
import { checkVerificationLimit } from '@/lib/security/rateLimit'
import { secureCompare } from '@/lib/security/crypto'
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
    const { email, code } = body

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { message: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      )
    }

    if (!isValidVerificationCode(code)) {
      return NextResponse.json(
        { message: 'Invalid verification code format' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limiting
    const clientIP = getClientIP(req)
    const rateLimit = checkVerificationLimit(clientIP, normalizedEmail)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          message: rateLimit.message,
          retryAfter: Math.ceil((rateLimit.resetTime! - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Check user and verification code
    const result = await query(
      `SELECT id, email, email_verification_code, email_verification_expires, email_verified
       FROM users 
       WHERE email = $1`,
      [normalizedEmail]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const user = result.rows[0]

    if (user.email_verified) {
      return NextResponse.json(
        { message: 'Email already verified' },
        { status: 400 }
      )
    }

    // Check if code is expired
    if (new Date(user.email_verification_expires) < new Date()) {
      return NextResponse.json(
        { message: 'Verification code has expired' },
        { status: 400 }
      )
    }

    // Normalize code (trim whitespace, remove any non-digit characters)
    const normalizedCode = code.trim().replace(/\D/g, '')
    const normalizedStoredCode = user.email_verification_code?.trim() || ''
    
    // Verify code using constant-time comparison (prevent timing attacks)
    if (!normalizedStoredCode || !secureCompare(normalizedStoredCode, normalizedCode)) {
      console.warn(`Email verification failed: Invalid code for user ${user.id}. Provided: "${code}" (normalized: "${normalizedCode}"), Expected: "${user.email_verification_code}" (normalized: "${normalizedStoredCode}")`)
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Update user as verified
    await query(
      `UPDATE users 
       SET email_verified = TRUE, 
           email_verification_code = NULL,
           email_verification_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    )

    // Generate JWT token (require JWT_SECRET to be set)
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('JWT_SECRET is not set or too weak')
      const sanitized = sanitizeError(new Error('Server configuration error'))
      return NextResponse.json(
        { message: sanitized.message },
        { status: sanitized.status }
      )
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    )

    return NextResponse.json(
      { 
        message: 'Email verified successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: true,
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

