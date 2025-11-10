// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { sanitizeError } from '@/lib/security/errors'

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret || jwtSecret.length < 32) {
    return null
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isAdmin: true }
    })

    if (!user || !user.isAdmin) {
      return null
    }

    return decoded.userId
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        walletAddress: true,
        nickname: true,
        balanceUsd: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        ipAddress: true,
        isBanned: true,
        authType: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Convert to snake_case for backward compatibility with frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      wallet_address: user.walletAddress,
      nickname: user.nickname,
      balance_usd: user.balanceUsd.toString(),
      email_verified: user.emailVerified,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
      ip_address: user.ipAddress,
      is_banned: user.isBanned,
      auth_type: user.authType
    }))

    return NextResponse.json(
      { users: formattedUsers },
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

