// scripts/create-admin.ts
import { config } from 'dotenv'
import { join } from 'path'
import bcrypt from 'bcryptjs'
import { query } from '../lib/db'

config({ path: join(process.cwd(), '.env.local') })

async function createAdmin() {
  try {
    console.log('🔄 Creating admin user...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment variables.')
    }

    const email = 'maksimgorkij21@gmail.com'
    const password = 'admin123'
    const passwordHash = await bcrypt.hash(password, 12)

    // Check if admin exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existing.rows.length > 0) {
      // Update existing user
      await query(
        `UPDATE users 
         SET password_hash = $1, 
             email_verified = TRUE, 
             is_admin = TRUE,
             nickname = COALESCE(nickname, 'admin'),
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $2`,
        [passwordHash, email]
      )
      console.log('✅ Admin user updated successfully!')
      console.log(`📧 Email: ${email}`)
      console.log(`🔑 Password: ${password}`)
    } else {
      // Create new admin user
      await query(
        `INSERT INTO users (
          email, 
          password_hash, 
          email_verified, 
          auth_type, 
          is_admin,
          nickname,
          created_at
        ) VALUES ($1, $2, TRUE, 'email', TRUE, 'admin', CURRENT_TIMESTAMP)`,
        [email, passwordHash]
      )
      console.log('✅ Admin user created successfully!')
      console.log(`📧 Email: ${email}`)
      console.log(`🔑 Password: ${password}`)
    }

    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

createAdmin()

