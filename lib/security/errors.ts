// lib/security/errors.ts
// Secure error handling - don't leak sensitive information

/**
 * Sanitizes error messages for client responses
 * Never expose internal errors, stack traces, or sensitive data
 */
export function sanitizeError(error: unknown): { message: string; status: number } {
  // In production, never expose internal error details
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (error instanceof Error) {
    // Log full error for debugging (server-side only)
    console.error('Error:', error)
    
    // Return generic message to client
    if (isProduction) {
      return {
        message: 'An error occurred. Please try again later.',
        status: 500,
      }
    }
    
    // In development, show more details
    return {
      message: error.message || 'An error occurred',
      status: 500,
    }
  }
  
  return {
    message: 'An unexpected error occurred',
    status: 500,
  }
}

/**
 * Validates required environment variables
 */
export function validateEnvVars(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env.local file.'
    )
  }
  
  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET
  if (jwtSecret && jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. ' +
      'Please generate a strong secret key.'
    )
  }
  
  // Check for default/weak secrets
  const weakSecrets = ['your-secret-key', 'secret', 'password', '123456']
  if (jwtSecret && weakSecrets.includes(jwtSecret.toLowerCase())) {
    throw new Error(
      'JWT_SECRET is using a weak default value. ' +
      'Please set a strong, unique secret key in your .env.local file.'
    )
  }
}

