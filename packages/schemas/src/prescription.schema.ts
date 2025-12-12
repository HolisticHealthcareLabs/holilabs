/**
 * Prescription Schema - Single Source of Truth
 * Electronic Prescribing with Safety Checks
 */

import { z } from 'zod';
import { MedicationItemSchema } from './clinical.schema';

// ============================================================================
// PRESCRIPTION SCHEMAS
// ============================================================================

export const CreatePrescriptionSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),
  medications: z.array(MedicationItemSchema).min(1, 'At least one medication required'),
  instructions: z.string().max(1000).optional(),
  diagnosis: z.string().max(500).optional(),
  signatureMethod: z.enum(['pin', 'signature']),
  signatureData: z.string().min(4, 'Signature data required'),
});

export const PrescriptionQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  clinicianId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'SIGNED', 'SENT', 'DISPENSED', 'CANCELLED']).optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// MEDICATION MANAGEMENT SCHEMAS
// ============================================================================

export const CreateMedicationSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  name: z.string().min(1, 'Medication name is required'),
  genericName: z.string().optional(),
  dose: z.string().min(1, 'Dose is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.string().optional(),
  instructions: z.string().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  prescribedBy: z.string().optional(),
  prescriptionHash: z.string().optional(),
});

export const UpdateMedicationSchema = CreateMedicationSchema.partial().omit({ patientId: true });

export const MedicationQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  isActive: z.string().optional().transform((v) => v === 'true'),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type PrescriptionQueryInput = z.infer<typeof PrescriptionQuerySchema>;
export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof UpdateMedicationSchema>;
export type MedicationQueryInput = z.infer<typeof MedicationQuerySchema>;
