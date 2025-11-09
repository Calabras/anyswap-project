// scripts/cleanup-unverified-users.ts
// Script to cleanup unverified users older than 15 minutes

import { config } from 'dotenv'
import { join } from 'path'
import { query } from '../lib/db'

config({ path: join(process.cwd(), '.env.local') })

async function cleanupUnverifiedUsers() {
  try {
    console.log('🔄 Cleaning up unverified users...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment variables.')
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

    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} unverified user(s):`)
      result.rows.forEach((user) => {
        console.log(`   - ${user.email} (created: ${user.created_at})`)
      })
    } else {
      console.log('✅ No unverified users to clean up')
    }

    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error cleaning up unverified users:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

cleanupUnverifiedUsers()

