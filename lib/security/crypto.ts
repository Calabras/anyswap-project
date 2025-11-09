// lib/security/crypto.ts
// Cryptographic utilities for secure operations

import { timingSafeEqual } from 'crypto'

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  try {
    const aBuffer = Buffer.from(a, 'utf8')
    const bBuffer = Buffer.from(b, 'utf8')
    return timingSafeEqual(aBuffer, bBuffer)
  } catch {
    return false
  }
}

/**
 * Generates a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto')
  return crypto.randomBytes(length).toString('hex')
}

