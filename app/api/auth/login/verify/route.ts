// app/api/auth/login/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        emailVerificationCode: true,
        emailVerificationExpires: true,
        emailVerified: true,
        nickname: true,
        isAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { message: 'Email not verified. Please complete registration first.' },
        { status: 400 }
      )
    }

    // Check if code is expired
    if (!user.emailVerificationExpires || new Date(user.emailVerificationExpires) < new Date()) {
      return NextResponse.json(
        { message: 'Verification code has expired' },
        { status: 400 }
      )
    }

    // Normalize code (trim whitespace, remove any non-digit characters)
    const normalizedCode = code.trim().replace(/\D/g, '')
    const normalizedStoredCode = user.emailVerificationCode?.trim() || ''
    
    // Verify code using constant-time comparison (prevent timing attacks)
    if (!normalizedStoredCode || !secureCompare(normalizedStoredCode, normalizedCode)) {
      console.warn(`Login verification failed: Invalid code for user ${user.id}. Provided: "${code}" (normalized: "${normalizedCode}"), Expected: "${user.emailVerificationCode}" (normalized: "${normalizedStoredCode}")`)
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Clear verification code and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: null,
        emailVerificationExpires: null,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }
    })

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

    return NextResponse.json(
      { 
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          authType: 'email',
          isAdmin: user.isAdmin || false,
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

