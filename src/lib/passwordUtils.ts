/**
 * Simple password hashing utilities for frontend-only auth.
 * Uses Web Crypto API for secure hashing.
 * Note: This is not as secure as server-side hashing but works for localStorage-based auth.
 */

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'autos_serra_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

/**
 * Generate a default password hash for new users
 */
export async function getDefaultPasswordHash(): Promise<string> {
  return hashPassword('123456');
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message: string;
} {
  if (password.length < 6) {
    return { valid: false, message: 'A senha deve ter pelo menos 6 caracteres' };
  }
  if (password.length > 50) {
    return { valid: false, message: 'A senha deve ter no máximo 50 caracteres' };
  }
  return { valid: true, message: 'Senha válida' };
}
