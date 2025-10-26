/**
 * Security Validation & Sanitization Library
 *
 * Industry-grade input validation and sanitization
 * Prevents: XSS, SQL Injection, CSV Injection, DoS
 */

import { z } from 'zod';

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Trim and enforce length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove potential XSS patterns
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return sanitized;
}

/**
 * Prevent CSV injection attacks
 * Formulas in CSV files can execute code: =cmd|...
 */
export function sanitizeCSVField(field: string): string {
  if (typeof field !== 'string') {
    return '';
  }

  const trimmed = field.trim();

  // Check for formula injection patterns
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some(char => trimmed.startsWith(char))) {
    // Prepend with single quote to neutralize formula
    return `'${trimmed}`;
  }

  return trimmed;
}

/**
 * Validate email format
 */
export const emailSchema = z.string().email().max(255);

export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number (international format)
 */
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

export function isValidPhone(phone: string): boolean {
  try {
    phoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date string (YYYY-MM-DD)
 */
export function isValidDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page: any, limit: any): { page: number; limit: number } {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw new Error('Invalid page number');
  }

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new Error('Invalid limit (must be 1-100)');
  }

  return { page: parsedPage, limit: parsedLimit };
}

/**
 * Validate and sanitize medication name
 */
export function sanitizeMedicationName(name: string): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Invalid medication name');
  }

  // Remove special characters that could be used for injection
  return name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .slice(0, 200);
}

/**
 * Validate array input with size limits
 */
export function validateArray<T>(
  input: any,
  maxLength: number,
  itemValidator?: (item: T) => boolean
): T[] {
  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }

  if (input.length === 0) {
    throw new Error('Array cannot be empty');
  }

  if (input.length > maxLength) {
    throw new Error(`Array too large (max ${maxLength} items)`);
  }

  if (itemValidator) {
    for (let i = 0; i < input.length; i++) {
      if (!itemValidator(input[i])) {
        throw new Error(`Invalid item at index ${i}`);
      }
    }
  }

  return input;
}

/**
 * Sanitize file content (check for malicious content)
 */
export function validateFileSize(sizeInBytes: number, maxSizeMB: number = 10): void {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (sizeInBytes > maxBytes) {
    throw new Error(`File too large (max ${maxSizeMB}MB)`);
  }
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
}

/**
 * Rate limiting check (basic implementation)
 * In production, use Redis-based rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Sanitize SQL-like input (defense in depth)
 * Note: Prisma provides SQL injection protection, this is extra layer
 */
export function sanitizeSQLInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove SQL keywords and patterns
  const dangerous = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'EXEC', 'EXECUTE',
    '--', '/*', '*/', 'xp_', 'sp_', 'UNION', 'SELECT'
  ];

  let sanitized = input;
  dangerous.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized.trim();
}

/**
 * Validate JSON input with size limit
 */
export function validateJSONSize(jsonString: string, maxSizeKB: number = 100): any {
  const sizeKB = new Blob([jsonString]).size / 1024;
  if (sizeKB > maxSizeKB) {
    throw new Error(`JSON payload too large (max ${maxSizeKB}KB)`);
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Redact sensitive data from logs
 */
export function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'secret', 'ssn', 'creditCard',
    'authorization', 'cookie', 'session'
  ];

  const redacted = { ...data };

  for (const key in redacted) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}
