// app/api/auth/register/email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'
import { isValidEmail, isValidPassword, sanitizeString, getClientIP, validateBodySize } from '@/lib/security/validation'
import { checkEmailRegistrationLimit } from '@/lib/security/rateLimit'
import { sanitizeError } from '@/lib/security/errors'

// Configure email transporter
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env file.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    connectionTimeout: 30000, // 30 seconds (increased from 10)
    greetingTimeout: 30000, // 30 seconds (increased from 10)
    socketTimeout: 30000, // 30 seconds (increased from 10)
    // Retry logic
    pool: false,
    maxConnections: 1,
    maxMessages: 1,
  })
}

const transporter = createTransporter()

export async function POST(req: NextRequest) {
  try {
    // Validate request body size (prevent DoS)
    const bodyText = await req.text()
    if (!validateBodySize(bodyText, 1024)) { // 1KB max
      return NextResponse.json(
        { message: 'Request body too large' },
        { status: 413 }
      )
    }
    
    const body = JSON.parse(bodyText)
    const { email, password } = body

    // Validate email format
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // If password is provided, validate it
    if (password) {
      const passwordValidation = isValidPassword(password)
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { message: passwordValidation.message || 'Invalid password' },
          { status: 400 }
        )
      }
    }

    // Check if user already exists FIRST (before rate limiting)
    const existingUser = await query(
      'SELECT id, email_verified, created_at, email_verification_expires FROM users WHERE email = $1',
      [normalizedEmail]
    )

    // Rate limiting - but skip for existing users who just need a new code
    const clientIP = getClientIP(req)
    const isExistingUser = existingUser.rows.length > 0
    
    // Only apply rate limiting for new registrations, not for resending codes to existing users
    if (!isExistingUser) {
      const rateLimit = checkEmailRegistrationLimit(clientIP, normalizedEmail)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { 
            message: rateLimit.message,
            retryAfter: Math.ceil((rateLimit.resetTime! - Date.now()) / 1000),
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString(),
            },
          }
        )
      }
    }

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0]
      
      // If user is already verified, they should use login endpoint, but we'll still send code for unified flow
      // This allows the unified form to work seamlessly
      if (user.email_verified) {
        // User is verified - they should login, but we'll send code anyway for unified experience
        // The frontend will handle this as login flow
      }
      
      // If password is provided, update existing user
      if (password) {
        // Hash password and update user
        const passwordHash = await bcrypt.hash(password, 12) // Increased salt rounds for better security
        await query(
          `UPDATE users 
           SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
           WHERE email = $2`,
          [passwordHash, normalizedEmail]
        )
        
        return NextResponse.json(
          { message: 'Password set successfully' },
          { status: 200 }
        )
      }
      
      // User exists but not verified - allow resending code
      // Continue to generate new code below
    }

    // Generate 6-digit verification code
    const code = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Create or update user in database
    let result
    if (existingUser.rows.length > 0) {
      // Update existing user with new verification code
      result = await query(
        `UPDATE users 
         SET email_verification_code = $1, 
             email_verification_expires = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $3
         RETURNING id, email, created_at`,
        [code, expiresAt, normalizedEmail]
      )
    } else {
      // Create new user
      const clientIP = getClientIP(req)
      try {
        result = await query(
          `INSERT INTO users (email, email_verification_code, email_verification_expires, auth_type, ip_address)
           VALUES ($1, $2, $3, 'email', $4)
           RETURNING id, email, created_at`,
          [normalizedEmail, code, expiresAt, clientIP]
        )
      } catch (error: any) {
        // Handle race condition - if user was created between check and insert
        if (error.message && error.message.includes('duplicate key')) {
          // User was created by another request, update instead
          result = await query(
            `UPDATE users 
             SET email_verification_code = $1, 
                 email_verification_expires = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE email = $3
             RETURNING id, email, created_at`,
            [code, expiresAt, normalizedEmail]
          )
        } else {
          throw error
        }
      }
    }

    const user = result.rows[0]

    // Send verification email (sanitize code to prevent XSS)
    const sanitizedCode = sanitizeString(code)
    
    // Try to verify SMTP connection, but don't fail if it times out
    // Sometimes verification can timeout but sending still works
    try {
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 5000))
      ])
      console.log('SMTP connection verified')
    } catch (verifyError: any) {
      console.warn('SMTP verification failed or timed out, but will try to send anyway:', verifyError.message)
      // Don't fail here - sometimes verification fails but sending works
    }

    const mailOptions = {
      from: `"AnySwap" <${process.env.SMTP_USER || 'noreply@anyswap.io'}>`,
      to: normalizedEmail,
      subject: 'Verify your AnySwap account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Inter', 'Gilroy', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif; background: #0f1419; color: #e5e7eb !important; font-size: 18px; line-height: 1.6; }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #fbbf24 0%, #eab308 100%);
                color: #0f1419 !important;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                padding: 30px;
                background: #1a1f2e;
                border-radius: 0 0 10px 10px;
                border: 1px solid #2d3748;
                color: #e5e7eb !important;
              }
              .content p {
                color: #e5e7eb !important;
                font-size: 18px;
                line-height: 1.6;
              }
              .code {
                font-family: 'Inter', 'Gilroy', 'Courier New', monospace;
                font-size: 36px;
                font-weight: bold;
                color: #fbbf24 !important;
                text-align: center;
                padding: 20px;
                background: #0f1419;
                border-radius: 8px;
                letter-spacing: 5px;
                margin: 20px 0;
                border: 1px solid #fbbf24;
                box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
              }
              .footer {
                text-align: center;
                color: #9ca3af !important;
                font-size: 14px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to AnySwap!</h1>
              </div>
              <div class="content">
                <p>Hi there!</p>
                <p>Thank you for registering with AnySwap. Please use the verification code below to complete your registration:</p>
                <div class="code">${sanitizedCode}</div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <p>Best regards,<br>The AnySwap Team</p>
              </div>
              <div class="footer">
                <p>© 2025 AnySwap. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // Send email with retry logic
    let lastError: any = null
    const maxRetries = 2
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retrying email send (attempt ${attempt + 1}/${maxRetries + 1})...`)
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        }
        
        await transporter.sendMail(mailOptions)
        console.log(`Verification code sent to ${normalizedEmail}`)
        lastError = null
        break // Success, exit retry loop
      } catch (emailError: any) {
        lastError = emailError
        console.error(`Failed to send verification email (attempt ${attempt + 1}):`, emailError.message)
        
        // Don't retry on authentication errors
        if (emailError.code === 'EAUTH') {
          break
        }
        
        // If this is the last attempt, don't continue
        if (attempt === maxRetries) {
          break
        }
      }
    }
    
    if (lastError) {
      console.error('Failed to send verification email after retries:', lastError)
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to send verification email. Please try again later.'
      
      if (lastError.code === 'ETIMEDOUT' || lastError.message?.includes('Greeting never received') || lastError.message?.includes('Timeout')) {
        errorMessage = 'SMTP connection timeout. This might be a temporary network issue. Please try again in a few minutes. If the problem persists, check your internet connection and SMTP settings in .env file.'
      } else if (lastError.code === 'EAUTH') {
        errorMessage = 'SMTP authentication failed. Please check SMTP_USER and SMTP_PASS in .env file. For Gmail, use App Password, not regular password.'
      } else if (lastError.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to SMTP server. Please check SMTP_HOST and SMTP_PORT in .env file. Make sure your firewall is not blocking the connection.'
      } else if (lastError.code === 'ESOCKET') {
        errorMessage = 'SMTP socket error. Please check your internet connection and SMTP settings.'
      }
      
      return NextResponse.json(
        { 
          message: errorMessage,
          error: process.env.NODE_ENV === 'development' ? lastError.message : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Verification code sent successfully',
        userId: user.id,
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
