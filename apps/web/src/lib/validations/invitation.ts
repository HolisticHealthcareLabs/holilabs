/**
 * Validation schemas for Invitation and Beta Signup APIs
 * Using Zod for runtime type validation
 */

import { z } from 'zod';

/**
 * Invitation Code Creation Schema
 */
export const createInvitationCodeSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'PHYSICIAN', 'NURSE', 'CLINICIAN', 'PATIENT']).optional(),
  maxUses: z.number().int().positive().default(1),
  expiresInDays: z.number().int().positive().default(30),
  createdBy: z.string().cuid(),
});

export type CreateInvitationCodeInput = z.infer<typeof createInvitationCodeSchema>;

/**
 * Invitation Code Deactivation Schema
 */
export const deactivateInvitationCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export type DeactivateInvitationCodeInput = z.infer<typeof deactivateInvitationCodeSchema>;

/**
 * Beta Signup Schema
 */
export const betaSignupSchema = z.object({
  email: z.string().email('Por favor proporciona un email válido'),
  fullName: z.string().min(1, 'Por favor proporciona tu nombre completo'),
  organization: z.string().optional(),
  role: z.string().optional(),
  country: z.string().optional(),
  referralSource: z.string().optional(),
  interests: z.array(z.string()).optional(),
  inviteCode: z.string().optional(),
});

export type BetaSignupInput = z.infer<typeof betaSignupSchema>;

/**
 * Beta Signup Approval Schema (Admin use)
 */
export const approveBetaSignupSchema = z.object({
  email: z.string().email(),
  approvedBy: z.string().cuid(),
});

export type ApproveBetaSignupInput = z.infer<typeof approveBetaSignupSchema>;

/**
 * Invitation Code Validation Helper
 */
export function validateInvitationCode(code: {
  isActive: boolean;
  expiresAt: Date;
  uses: number;
  maxUses: number;
  email?: string | null;
}, userEmail?: string): { valid: boolean; error?: string } {
  if (!code.isActive) {
    return { valid: false, error: 'Este código de invitación ha sido desactivado' };
  }

  if (new Date() > code.expiresAt) {
    return { valid: false, error: 'Este código de invitación ha expirado' };
  }

  if (code.uses >= code.maxUses) {
    return { valid: false, error: 'Este código de invitación ha alcanzado su límite de usos' };
  }

  if (code.email && userEmail && code.email !== userEmail) {
    return { valid: false, error: 'Este código de invitación no es válido para tu email' };
  }

  return { valid: true };
}
