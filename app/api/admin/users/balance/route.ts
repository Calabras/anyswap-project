// app/api/admin/users/balance/route.ts
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

export async function POST(req: NextRequest) {
  try {
    const adminId = await verifyAdmin(req)
    if (!adminId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { userId, amount, action } = body

    if (!userId || !amount || !action) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action !== 'add' && action !== 'subtract') {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      )
    }

    // Get current balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balanceUsd: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    const currentBalance = parseFloat(user.balanceUsd.toString())
    const newBalance = action === 'add' 
      ? currentBalance + parseFloat(amount)
      : Math.max(0, currentBalance - parseFloat(amount))

    // Update balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        balanceUsd: newBalance,
        updatedAt: new Date()
      }
    })

    // Log transaction (Note: Transaction schema may need adjustment)
    // For now, commenting out until we verify Transaction model
    /*
    await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: (action === 'add' ? parseFloat(amount) : -parseFloat(amount)).toString(),
        status: 'CONFIRMED',
        network: 'admin',
        metadata: {
          action,
          adminId,
          reason: 'admin_balance_adjustment'
        }
      }
    })
    */

    return NextResponse.json(
      { message: 'Balance updated successfully', newBalance },
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

