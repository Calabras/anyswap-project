// app/api/auth/wallet/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { validateBodySize } from '@/lib/security/validation'
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
    const { walletAddress, nickname } = body

    // Validate inputs
    if (!walletAddress || !nickname) {
      return NextResponse.json(
        { message: 'Wallet address and nickname are required' },
        { status: 400 }
      )
    }

    if (nickname.length < 3 || nickname.length > 20) {
      return NextResponse.json(
        { message: 'Nickname must be between 3 and 20 characters' },
        { status: 400 }
      )
    }

    // Normalize wallet address
    const normalizedAddress = walletAddress.toLowerCase().trim()

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        nickname: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
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
      { userId: user.id, walletAddress: user.walletAddress },
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
          walletAddress: user.walletAddress,
          nickname,
          authType: 'wallet',
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

