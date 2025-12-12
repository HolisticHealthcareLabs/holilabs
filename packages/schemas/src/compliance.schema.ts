/**
 * Compliance Schema - Single Source of Truth
 * Consents, Documents, Audit Logs
 */

import { z } from 'zod';

// ============================================================================
// CONSENT SCHEMAS
// ============================================================================

export const CreateConsentSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  type: z.enum(['TREATMENT', 'DATA_SHARING', 'RESEARCH', 'TELEMEDICINE', 'PHOTOGRAPHY']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  version: z.string().default('1.0'),
  signatureData: z.string().min(1, 'Signature required'),
  witnessName: z.string().optional(),
  witnessSignature: z.string().optional(),
});

export const ConsentQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  type: z.enum(['TREATMENT', 'DATA_SHARING', 'RESEARCH', 'TELEMEDICINE', 'PHOTOGRAPHY']).optional(),
  isActive: z.string().optional().transform((v) => v === 'true'),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const DocumentUploadSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
  documentType: z.enum([
    'LAB_RESULTS',
    'IMAGING',
    'CONSULTATION_NOTES',
    'DISCHARGE_SUMMARY',
    'PRESCRIPTION',
    'INSURANCE',
    'CONSENT_FORM',
    'OTHER',
  ]),
  storageUrl: z.string().url('Invalid storage URL'),
  uploadedBy: z.string().cuid('Invalid uploader ID'),
});

export const DocumentQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  documentType: z.enum([
    'LAB_RESULTS',
    'IMAGING',
    'CONSULTATION_NOTES',
    'DISCHARGE_SUMMARY',
    'PRESCRIPTION',
    'INSURANCE',
    'CONSENT_FORM',
    'OTHER',
  ]).optional(),
  isDeidentified: z.string().optional().transform((v) => v === 'true'),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

export const CreateAuditLogSchema = z.object({
  userEmail: z.string().email().optional().default('system'),
  action: z.enum([
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'SHARE',
    'CONSENT_GIVEN',
    'CONSENT_REVOKED',
  ]),
  resource: z.string().min(1, 'Resource is required'),
  resourceId: z.string().default('N/A'),
  details: z.record(z.any()).optional(),
  success: z.boolean().default(true),
});

export const AuditLogQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  userEmail: z.string().email().optional(),
  action: z.enum([
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'SHARE',
    'CONSENT_GIVEN',
    'CONSENT_REVOKED',
  ]).optional(),
  resource: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().default('100').transform(Number),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateConsentInput = z.infer<typeof CreateConsentSchema>;
export type ConsentQueryInput = z.infer<typeof ConsentQuerySchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type DocumentQueryInput = z.infer<typeof DocumentQuerySchema>;
export type CreateAuditLogInput = z.infer<typeof CreateAuditLogSchema>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
