// app/api/auth/wallet/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    const userResult = await query(
      `SELECT id, email, wallet_address, nickname
       FROM users 
       WHERE wallet_address = $1`,
      [normalizedAddress]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

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
      { userId: user.id, walletAddress: user.wallet_address },
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
          walletAddress: user.wallet_address,
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

