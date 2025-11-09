// lib/db/index.ts
import { Pool } from 'pg'

let pool: Pool | null = null
let dbConnected = false // Flag to prevent multiple connection messages

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set in environment variables')
    }

    pool = new Pool({
      connectionString,
      // SSL configuration - in production, use proper SSL certificates
      ssl: process.env.NODE_ENV === 'production' 
        ? { 
            rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
            // Add CA certificate if available
            ...(process.env.DATABASE_CA_CERT && { ca: process.env.DATABASE_CA_CERT }),
          }
        : false,
      // Connection pool settings for better security and performance
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    })

    // Test connection only once
    if (!dbConnected) {
      pool.query('SELECT NOW()')
        .then(() => {
          if (!dbConnected) {
            console.log('✅ Database connected successfully')
            dbConnected = true
          }
        })
        .catch((err) => {
          console.error('❌ Database connection error:', err)
          dbConnected = false
        })
    }
  }

  return pool
}

export async function query(text: string, params?: any[]) {
  const db = getPool()
  return db.query(text, params)
}

