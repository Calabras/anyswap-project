// app/api/auth/wallet/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { getClientIP, validateBodySize } from '@/lib/security/validation'
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
    const { walletAddress } = body

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { message: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Normalize wallet address (lowercase)
    const normalizedAddress = walletAddress.toLowerCase().trim()

    // Check if user exists with this wallet
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        nickname: true,
        authType: true,
        createdAt: true,
        isAdmin: true
      }
    })

    if (!user) {
      // Create new user with wallet
      const clientIP = getClientIP(req)
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          authType: 'wallet',
          ipAddress: clientIP,
          emailVerified: true // Wallet auth doesn't need email verification
        },
        select: {
          id: true,
          email: true,
          walletAddress: true,
          nickname: true,
          authType: true,
          createdAt: true,
          isAdmin: true
        }
      })
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

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
        message: 'Wallet connected successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.walletAddress,
          nickname: user.nickname,
          authType: user.authType,
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

