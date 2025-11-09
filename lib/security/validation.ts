// lib/security/validation.ts
// Security utilities for input validation and sanitization

/**
 * Validates email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  // Additional checks
  if (email.length > 254) return false // RFC 5321 limit
  if (email.split('@').length !== 2) return false
  
  return emailRegex.test(email)
}

/**
 * Validates password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' }
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' }
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' }
  }
  
  return { valid: true }
}

/**
 * Validates verification code format (6 digits)
 */
export function isValidVerificationCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false
  return /^\d{6}$/.test(code)
}

/**
 * Sanitizes string to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validates IP address format
 */
export function isValidIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false
  
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.')
    return parts.every(part => {
      const num = parseInt(part, 10)
      return num >= 0 && num <= 255
    })
  }
  
  return ipv6Regex.test(ip)
}

/**
 * Extracts and validates IP address from request headers
 */
export function getClientIP(req: { headers: Headers | { get: (key: string) => string | null } }): string {
  const headers = req.headers
  const forwardedFor = headers.get('x-forwarded-for')
  const realIP = headers.get('x-real-ip')
  const cfConnectingIP = headers.get('cf-connecting-ip') // Cloudflare
  
  // Get first IP from forwarded-for (can contain multiple IPs)
  const ip = forwardedFor?.split(',')[0]?.trim() || 
             cfConnectingIP || 
             realIP || 
             'unknown'
  
  // Validate IP before returning
  if (isValidIP(ip)) {
    return ip
  }
  
  return 'unknown'
}

/**
 * Validates request body size (prevent DoS)
 */
export function validateBodySize(body: string, maxSize: number = 1024 * 1024): boolean {
  if (!body) return true
  return body.length <= maxSize
}

