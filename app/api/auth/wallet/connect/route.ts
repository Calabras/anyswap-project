// app/api/auth/wallet/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    const userResult = await query(
      `SELECT id, email, wallet_address, nickname, auth_type, created_at
       FROM users 
       WHERE wallet_address = $1`,
      [normalizedAddress]
    )

    let user

    if (userResult.rows.length === 0) {
      // Create new user with wallet
      const clientIP = getClientIP(req)
      const result = await query(
        `INSERT INTO users (wallet_address, auth_type, ip_address)
         VALUES ($1, 'wallet', $2)
         RETURNING id, email, wallet_address, nickname, auth_type, created_at`,
        [normalizedAddress, clientIP]
      )
      user = result.rows[0]
    } else {
      user = userResult.rows[0]
      
      // Update last login
      await query(
        `UPDATE users 
         SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user.id]
      )
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
      { userId: user.id, walletAddress: user.wallet_address },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // Get user with admin status
    const adminResult = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [user.id]
    )

    return NextResponse.json(
      { 
        message: 'Wallet connected successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.wallet_address,
          nickname: user.nickname,
          authType: user.auth_type,
          isAdmin: adminResult.rows[0]?.is_admin || false,
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

