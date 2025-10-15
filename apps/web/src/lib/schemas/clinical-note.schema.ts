/**
 * Clinical Note Validation Schemas
 *
 * Zod schemas for validating SOAP notes and clinical documentation
 */

import { z } from 'zod';

// Vital signs validation with medical ranges
const vitalSignsSchema = z.object({
  bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, {
    message: 'Presión arterial inválida (formato: 120/80)',
  }).optional().nullable(),
  heartRate: z.number().int().min(30, 'Frecuencia cardíaca muy baja').max(250, 'Frecuencia cardíaca muy alta').optional().nullable(),
  temperature: z.number().min(32.0, 'Temperatura muy baja').max(43.0, 'Temperatura muy alta').optional().nullable(),
  respiratoryRate: z.number().int().min(5, 'Frecuencia respiratoria muy baja').max(60, 'Frecuencia respiratoria muy alta').optional().nullable(),
  oxygenSaturation: z.number().int().min(50, 'Saturación de oxígeno muy baja').max(100, 'Saturación de oxígeno inválida').optional().nullable(),
  weight: z.number().min(0.5, 'Peso muy bajo').max(500, 'Peso muy alto').optional().nullable(),
}).optional().nullable();

// ICD-10 diagnosis code validation
const diagnosisSchema = z.object({
  code: z.string().regex(/^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/, {
    message: 'Código ICD-10 inválido (formato: A00 o A00.0)',
  }),
  description: z.string().min(3, 'Descripción muy corta').max(200, 'Descripción muy larga'),
});

// Procedure code validation (simplified)
const procedureSchema = z.object({
  code: z.string().min(2, 'Código de procedimiento inválido').max(20, 'Código muy largo'),
  description: z.string().min(3, 'Descripción muy corta').max(200, 'Descripción muy larga'),
});

/**
 * Create Clinical Note Schema
 * Used for POST /api/clinical-notes
 */
export const createClinicalNoteSchema = z.object({
  // Required fields
  patientId: z.string().uuid('ID de paciente inválido'),
  authorId: z.string().uuid('ID de autor inválido'),
  type: z.enum(['SOAP', 'Progress', 'Admission', 'Discharge', 'Procedure', 'Emergency'], {
    errorMap: () => ({ message: 'Tipo de nota inválido' }),
  }),

  // SOAP fields (all optional but at least one should be provided)
  subjective: z.string().max(5000, 'Sección subjetiva muy larga').optional().nullable(),
  objective: z.string().max(5000, 'Sección objetiva muy larga').optional().nullable(),
  assessment: z.string().max(5000, 'Sección de evaluación muy larga').optional().nullable(),
  plan: z.string().max(5000, 'Sección de plan muy larga').optional().nullable(),

  // Vital signs
  vitalSigns: vitalSignsSchema,

  // Diagnoses and procedures
  diagnoses: z.array(diagnosisSchema).max(20, 'Demasiados diagnósticos').optional().nullable(),
  procedures: z.array(procedureSchema).max(20, 'Demasiados procedimientos').optional().nullable(),

  // Metadata
  sessionId: z.string().uuid('ID de sesión inválido').optional().nullable(),
  recordingDuration: z.number().int().min(0).max(36000, 'Duración de grabación inválida').optional().nullable(), // Max 10 hours
}).refine(
  (data) => data.subjective || data.objective || data.assessment || data.plan,
  {
    message: 'Debe proporcionar al menos una sección SOAP (Subjetivo, Objetivo, Evaluación, o Plan)',
  }
);

/**
 * Update Clinical Note Schema
 * Used for PUT /api/clinical-notes/[id]
 * All fields optional for partial updates
 */
export const updateClinicalNoteSchema = z.object({
  type: z.enum(['SOAP', 'Progress', 'Admission', 'Discharge', 'Procedure', 'Emergency']).optional(),
  subjective: z.string().max(5000).optional().nullable(),
  objective: z.string().max(5000).optional().nullable(),
  assessment: z.string().max(5000).optional().nullable(),
  plan: z.string().max(5000).optional().nullable(),
  vitalSigns: vitalSignsSchema,
  diagnoses: z.array(diagnosisSchema).max(20).optional().nullable(),
  procedures: z.array(procedureSchema).max(20).optional().nullable(),
  dataHash: z.string().length(64, 'Hash de datos inválido (debe ser SHA-256)').optional().nullable(),
});

/**
 * Clinical Note Query Params Schema
 * Used for GET /api/clinical-notes (list with filters)
 */
export const clinicalNoteQuerySchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido').optional(),
  authorId: z.string().uuid('ID de autor inválido').optional(),
  type: z.enum(['SOAP', 'Progress', 'Admission', 'Discharge', 'Procedure', 'Emergency']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)').optional(),
  search: z.string().max(100, 'Búsqueda muy larga').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});

// Export types for TypeScript
export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>;
export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>;
export type ClinicalNoteQueryInput = z.infer<typeof clinicalNoteQuerySchema>;
export type VitalSigns = z.infer<typeof vitalSignsSchema>;
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export type Procedure = z.infer<typeof procedureSchema>;
