// app/api/cron/cleanup-unverified/route.ts
// API endpoint to cleanup unverified users (can be called by cron job)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeError } from '@/lib/security/errors'

// Optional: Add API key protection for cron jobs
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  try {
    // Optional: Verify cron secret
    if (CRON_SECRET) {
      const authHeader = req.headers.get('authorization')
      if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Delete unverified users older than 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    
    // First get users to be deleted (for logging)
    const usersToDelete = await prisma.user.findMany({
      where: {
        emailVerified: false,
        OR: [
          {
            emailVerificationExpires: {
              lt: fifteenMinutesAgo
            }
          },
          {
            emailVerificationExpires: null,
            createdAt: {
              lt: fifteenMinutesAgo
            }
          }
        ]
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    })
    
    // Delete them
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: usersToDelete.map(u => u.id)
        }
      }
    })

    const deletedCount = result.count

    return NextResponse.json(
      { 
        message: `Cleaned up ${deletedCount} unverified user(s)`,
        deletedCount,
        deletedUsers: usersToDelete.map(u => ({ id: u.id, email: u.email }))
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

// Also support GET for easy testing
export async function GET(req: NextRequest) {
  return POST(req)
}

