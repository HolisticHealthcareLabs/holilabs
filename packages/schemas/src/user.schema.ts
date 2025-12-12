/**
 * User Schema - Single Source of Truth
 * User Management, Authentication
 */

import { z } from 'zod';

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF']).default('CLINICIAN'),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  mfaEnabled: z.boolean().optional(),
});

export const UserQuerySchema = z.object({
  role: z.enum(['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF']).optional(),
  search: z.string().optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
