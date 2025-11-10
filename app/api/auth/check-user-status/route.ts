// app/api/auth/check-user-status/route.ts
// Check if user exists and is verified (for unified auth flow)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        password: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { 
          exists: false,
          emailVerified: false,
          hasPassword: false
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { 
        exists: true,
        emailVerified: user.emailVerified || false,
        hasPassword: !!user.password,
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

