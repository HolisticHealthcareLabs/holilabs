/**
 * Appointment & Scheduling Schema - Single Source of Truth
 */

import { z } from 'zod';

// ============================================================================
// APPOINTMENT SCHEMAS
// ============================================================================

export const CreateAppointmentSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  clinicianId: z.string().cuid('Invalid clinician ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().datetime().or(z.date()),
  endTime: z.string().datetime().or(z.date()),
  timezone: z.string().default('America/Mexico_City'),
  type: z.enum(['IN_PERSON', 'TELEMEDICINE', 'PHONE', 'HOME_VISIT']).default('IN_PERSON'),
  meetingUrl: z.string().url().optional(),
});

export const UpdateAppointmentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().or(z.date()).optional(),
  endTime: z.string().datetime().or(z.date()).optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  meetingUrl: z.string().url().optional(),
});

export const AppointmentQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  clinicianId: z.string().cuid().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().optional().default('50').transform(Number),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentQueryInput = z.infer<typeof AppointmentQuerySchema>;
