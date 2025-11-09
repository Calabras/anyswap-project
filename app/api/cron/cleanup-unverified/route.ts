// app/api/cron/cleanup-unverified/route.ts
// API endpoint to cleanup unverified users (can be called by cron job)

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
    const result = await query(
      `DELETE FROM users 
       WHERE email_verified = FALSE 
       AND (
         email_verification_expires < NOW() - INTERVAL '15 minutes'
         OR (email_verification_expires IS NULL AND created_at < NOW() - INTERVAL '15 minutes')
       )
       RETURNING id, email, created_at`
    )

    const deletedCount = result.rows.length

    return NextResponse.json(
      { 
        message: `Cleaned up ${deletedCount} unverified user(s)`,
        deletedCount,
        deletedUsers: result.rows.map(u => ({ id: u.id, email: u.email }))
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

