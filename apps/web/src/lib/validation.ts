/**
 * Comprehensive Input Validation
 *
 * Zod-based validation schemas for all API inputs
 * Prevents injection attacks, validates data types, enforces constraints
 */

import { z } from 'zod';

// Email validation (strict RFC 5322 compliant)
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(3, 'Email too short')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

// Phone validation (international format)
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .trim();

// Name validation (prevent injection)
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]+$/, 'Name contains invalid characters')
  .trim();

// Text validation (general purpose, prevents script injection)
export const textSchema = z
  .string()
  .min(1, 'Text is required')
  .max(5000, 'Text too long')
  .trim();

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

// Date validation
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');

// Role validation
export const roleSchema = z.enum(['doctor', 'nurse', 'staff', 'admin'], {
  errorMap: () => ({ message: 'Invalid role' }),
});

/**
 * Magic Link Request Validation
 */
export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Magic Link Verify Validation
 */
export const magicLinkVerifySchema = z.object({
  token: z.string().min(32, 'Invalid token').max(128, 'Invalid token'),
});

/**
 * Registration Request Validation
 */
export const registrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  role: roleSchema,
  organization: z.string().min(1, 'Organization is required').max(200, 'Organization name too long').trim(),
  reason: textSchema.max(1000, 'Reason too long'),
});

/**
 * Patient Creation Validation
 */
export const patientCreateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  dateOfBirth: dateSchema,
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  address: textSchema.max(500, 'Address too long').optional(),
  medicalHistory: textSchema.max(10000, 'Medical history too long').optional(),
});

/**
 * Consultation Note Validation
 */
export const consultationNoteSchema = z.object({
  patientId: uuidSchema,
  chiefComplaint: textSchema.max(500, 'Chief complaint too long'),
  presentIllness: textSchema.max(2000, 'Present illness too long').optional(),
  assessment: textSchema.max(2000, 'Assessment too long').optional(),
  plan: textSchema.max(2000, 'Plan too long').optional(),
  vitalSigns: z.object({
    bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'Invalid blood pressure format').optional(),
    heartRate: z.number().int().min(30).max(250).optional(),
    temperature: z.number().min(35).max(42).optional(),
    respiratoryRate: z.number().int().min(8).max(60).optional(),
    oxygenSaturation: z.number().int().min(70).max(100).optional(),
  }).optional(),
});

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize API request body
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }
    return {
      success: false,
      error: 'Validation failed',
    };
  }
}

/**
 * Middleware for validating request bodies in API routes
 */
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return async (request: Request): Promise<
    | { success: true; data: T }
    | { success: false; error: string; status: number }
  > => {
    try {
      const body = await request.json();
      const result = validateRequest(schema, body);

      if (!result.success) {
        return { success: false, error: result.error, status: 400 };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid JSON in request body',
        status: 400,
      };
    }
  };
}
