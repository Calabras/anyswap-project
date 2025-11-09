// lib/security/rateLimit.ts
// Simple in-memory rate limiting (for production, use Redis)

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Simple rate limiter
 * @param key - Unique identifier (IP, email, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    const entries = Array.from(rateLimitStore.entries())
    for (const [k, v] of entries) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }
  }
  
  if (!entry || entry.resetTime < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }
  
  // Increment count
  entry.count++
  
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Rate limit for email registration
 */
export function checkEmailRegistrationLimit(ip: string, email: string) {
  // Limit by IP: 3 requests per 15 minutes
  const ipLimit = checkRateLimit(`email_reg:ip:${ip}`, 3, 15 * 60 * 1000)
  if (!ipLimit.allowed) {
    return {
      allowed: false,
      message: 'Too many registration attempts. Please try again later.',
      resetTime: ipLimit.resetTime,
    }
  }
  
  // Limit by email: 5 requests per hour
  const emailLimit = checkRateLimit(`email_reg:email:${email}`, 5, 60 * 60 * 1000)
  if (!emailLimit.allowed) {
    return {
      allowed: false,
      message: 'Too many registration attempts for this email. Please try again later.',
      resetTime: emailLimit.resetTime,
    }
  }
  
  return {
    allowed: true,
    resetTime: Math.max(ipLimit.resetTime, emailLimit.resetTime),
  }
}

/**
 * Rate limit for verification code attempts
 */
export function checkVerificationLimit(ip: string, email: string) {
  // Limit by IP: 10 attempts per 15 minutes
  const ipLimit = checkRateLimit(`verify:ip:${ip}`, 10, 15 * 60 * 1000)
  if (!ipLimit.allowed) {
    return {
      allowed: false,
      message: 'Too many verification attempts. Please try again later.',
      resetTime: ipLimit.resetTime,
    }
  }
  
  // Limit by email: 20 attempts per hour
  const emailLimit = checkRateLimit(`verify:email:${email}`, 20, 60 * 60 * 1000)
  if (!emailLimit.allowed) {
    return {
      allowed: false,
      message: 'Too many verification attempts for this email. Please try again later.',
      resetTime: emailLimit.resetTime,
    }
  }
  
  return {
    allowed: true,
    resetTime: Math.max(ipLimit.resetTime, emailLimit.resetTime),
  }
}

