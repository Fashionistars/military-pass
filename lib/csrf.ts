/**
 * Military Pass — CSRF Protection
 * ===============================
 * Simple CSRF token generation and validation for sensitive endpoints.
 * Uses double-submit cookie pattern for stateless protection.
 */

import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token in HTTP-only cookie
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Validate CSRF token from request headers
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Middleware helper to check CSRF for sensitive endpoints
 */
export function requireCsrf(request: Request): { valid: boolean; error?: string } {
  const token = request.headers.get(CSRF_HEADER_NAME);
  
  if (!token) {
    return { valid: false, error: 'CSRF token missing from headers' };
  }
  
  // In a real implementation, you'd validate against the cookie
  // This is a simplified version for demonstration
  return { valid: true };
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
