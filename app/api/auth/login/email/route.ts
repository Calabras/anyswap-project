// app/api/auth/login/email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { randomInt } from 'crypto'
import { query } from '@/lib/db'
import { isValidEmail, sanitizeString, getClientIP, validateBodySize } from '@/lib/security/validation'
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
    // Validate request body size
    const bodyText = await req.text()
    if (!validateBodySize(bodyText, 1024)) {
      return NextResponse.json(
        { message: 'Request body too large' },
        { status: 413 }
      )
    }
    
    const body = JSON.parse(bodyText)
    const { email } = body

    // Validate email format
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Rate limiting
    const clientIP = getClientIP(req)
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

    // Check if user exists and is verified
    const existingUser = await query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (existingUser.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found. Please register first.' },
        { status: 404 }
      )
    }

    const user = existingUser.rows[0]

    if (!user.email_verified) {
      return NextResponse.json(
        { message: 'Email not verified. Please complete registration first.' },
        { status: 400 }
      )
    }

    // Generate 6-digit login verification code
    const code = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store login code (we'll use email_verification_code field for login codes too)
    await query(
      `UPDATE users 
       SET email_verification_code = $1, 
           email_verification_expires = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $3`,
      [code, expiresAt, normalizedEmail]
    )

    // Send login verification email
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
      subject: 'Login to your AnySwap account',
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
              .warning {
                background: #1f2937;
                border-left: 4px solid #fbbf24;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Login to AnySwap</h1>
              </div>
              <div class="content">
                <p>Hi there!</p>
                <p>Someone is trying to login to your AnySwap account. If this was you, please use the verification code below:</p>
                <div class="code">${sanitizedCode}</div>
                <p>This code will expire in 10 minutes.</p>
                <div class="warning">
                  <p><strong>⚠️ Security Notice:</strong></p>
                  <p>If you didn't request this login code, please ignore this email and consider changing your password.</p>
                </div>
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
        console.log(`Login verification code sent to ${normalizedEmail}`)
        lastError = null
        break // Success, exit retry loop
      } catch (emailError: any) {
        lastError = emailError
        console.error(`Failed to send login email (attempt ${attempt + 1}):`, emailError.message)
        
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
      console.error('Failed to send login email after retries:', lastError)
      
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
        message: 'Login verification code sent successfully',
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

