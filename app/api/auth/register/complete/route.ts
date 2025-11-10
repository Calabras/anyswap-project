// app/api/auth/register/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
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
        { message: 'Email not verified' },
        { status: 400 }
      )
    }

    // Check if nickname is already taken
    const nicknameCheck = await prisma.user.findFirst({
      where: {
        nickname: nickname,
        NOT: { id: user.id }
      },
      select: { id: true }
    })

    if (nicknameCheck) {
      return NextResponse.json(
        { message: 'Nickname already taken' },
        { status: 409 }
      )
    }

    // Update user with nickname
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nickname: nickname,
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
        message: 'Registration completed successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname,
          emailVerified: true,
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

