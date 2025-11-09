// scripts/migrate.ts
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
import { query } from '../lib/db'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...')

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment variables. Please check your .env.local file.')
    }

    console.log('📦 Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')) // Hide password

    // Read all migration files in order
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_add_nickname.sql',
      '003_add_admin_and_roles.sql',
      '005_update_payment_systems_type.sql', // Must run before 004
      '004_init_payment_systems.sql',
    ]

    for (const migrationFile of migrationFiles) {
      const migrationPath = join(process.cwd(), 'lib/db/migrations', migrationFile)
      console.log(`📄 Running migration: ${migrationFile}`)
      
      try {
        const migrationSQL = readFileSync(migrationPath, 'utf-8')

        // Split SQL into individual statements and execute them
        // Remove comments and split by semicolon
        const cleanedSQL = migrationSQL
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')

        // Split by semicolon, but keep multi-line statements together
        const statements = cleanedSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0)

        console.log(`📝 Found ${statements.length} SQL statements to execute...`)

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i]
          if (statement.trim()) {
            try {
              // Execute statement with semicolon
              await query(statement)
              console.log(`✅ Executed statement ${i + 1}/${statements.length}`)
            } catch (error: any) {
              // Ignore "already exists" errors
              if (error.message.includes('already exists') || 
                  error.message.includes('duplicate') ||
                  error.message.includes('relation') && error.message.includes('already exists') ||
                  error.message.includes('ON CONFLICT')) {
                console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
              } else {
                console.error(`❌ Error in statement ${i + 1}:`, statement.substring(0, 100))
                throw error
              }
            }
          }
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`⚠️  Migration file ${migrationFile} not found, skipping...`)
        } else {
          throw error
        }
      }
    }

    console.log('✅ Database migrations completed successfully!')
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Migration error:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

runMigrations()

