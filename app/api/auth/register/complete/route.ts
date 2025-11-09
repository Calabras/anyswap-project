// app/api/auth/register/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { isValidEmail, getClientIP, validateBodySize } from '@/lib/security/validation'
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
    const { email, nickname } = body

    // Validate inputs
    if (!email || !nickname) {
      return NextResponse.json(
        { message: 'Email and nickname are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      )
    }

    if (nickname.length < 3 || nickname.length > 20) {
      return NextResponse.json(
        { message: 'Nickname must be between 3 and 20 characters' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists and is verified
    const userResult = await query(
      `SELECT id, email, email_verified, nickname
       FROM users 
       WHERE email = $1`,
      [normalizedEmail]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    if (!user.email_verified) {
      return NextResponse.json(
        { message: 'Email not verified' },
        { status: 400 }
      )
    }

    // Check if nickname is already taken
    const nicknameCheck = await query(
      'SELECT id FROM users WHERE nickname = $1 AND id != $2',
      [nickname, user.id]
    )

    if (nicknameCheck.rows.length > 0) {
      return NextResponse.json(
        { message: 'Nickname already taken' },
        { status: 409 }
      )
    }

    // Update user with nickname
    await query(
      `UPDATE users 
       SET nickname = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [nickname, user.id]
    )

    // Generate JWT token
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

    // Get user with admin status
    const userResult = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [user.id]
    )

    return NextResponse.json(
      { 
        message: 'Registration completed successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname,
          emailVerified: true,
          isAdmin: userResult.rows[0]?.is_admin || false,
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

