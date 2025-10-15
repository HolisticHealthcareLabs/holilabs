/**
 * Medication Validation Schemas
 *
 * Zod schemas for validating medication and prescription data
 */

import { z } from 'zod';

// Dosage validation
const dosageSchema = z.object({
  amount: z.number().positive('Cantidad debe ser positiva').max(10000, 'Cantidad muy alta'),
  unit: z.enum(['mg', 'g', 'mcg', 'ml', 'L', 'UI', 'comprimido', 'cápsula', 'gota', 'aplicación'], {
    errorMap: () => ({ message: 'Unidad de dosificación inválida' }),
  }),
});

// Frequency validation
const frequencySchema = z.enum(
  ['una vez al día', 'dos veces al día', 'tres veces al día', 'cuatro veces al día', 'cada 4 horas', 'cada 6 horas', 'cada 8 horas', 'cada 12 horas', 'según sea necesario', 'antes de dormir', 'en ayunas', 'con alimentos'],
  {
    errorMap: () => ({ message: 'Frecuencia inválida' }),
  }
);

// Route of administration
const routeSchema = z.enum(
  ['oral', 'sublingual', 'tópica', 'intravenosa', 'intramuscular', 'subcutánea', 'inhalatoria', 'rectal', 'oftálmica', 'ótica', 'nasal', 'transdérmica'],
  {
    errorMap: () => ({ message: 'Vía de administración inválida' }),
  }
);

/**
 * Create Medication Schema
 * Used for POST /api/medications
 */
export const createMedicationSchema = z.object({
  // Required fields
  name: z.string().min(2, 'Nombre muy corto').max(200, 'Nombre muy largo'),
  genericName: z.string().min(2, 'Nombre genérico muy corto').max(200, 'Nombre genérico muy largo').optional().nullable(),

  // Classification
  category: z.enum(
    ['analgesic', 'antibiotic', 'antiviral', 'antifungal', 'cardiovascular', 'diabetes', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'hormonal', 'immunosuppressant', 'other'],
    { errorMap: () => ({ message: 'Categoría inválida' }) }
  ).optional().nullable(),

  // Dosage information
  defaultDosage: z.string().max(100, 'Dosificación muy larga').optional().nullable(),
  dosageForm: z.enum(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'drops', 'other'], {
    errorMap: () => ({ message: 'Forma de dosificación inválida' }),
  }).optional().nullable(),

  // Additional information
  manufacturer: z.string().max(100, 'Nombre de fabricante muy largo').optional().nullable(),
  requiresPrescription: z.boolean().default(true),
  isControlledSubstance: z.boolean().default(false),

  // Warnings and contraindications
  warnings: z.string().max(2000, 'Advertencias muy largas').optional().nullable(),
  contraindications: z.string().max(2000, 'Contraindicaciones muy largas').optional().nullable(),
  sideEffects: z.string().max(2000, 'Efectos secundarios muy largos').optional().nullable(),

  // Metadata
  notes: z.string().max(1000, 'Notas muy largas').optional().nullable(),
  isActive: z.boolean().default(true),
});

/**
 * Update Medication Schema
 * Used for PUT /api/medications/[id]
 */
export const updateMedicationSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  genericName: z.string().min(2).max(200).optional().nullable(),
  category: z.enum(['analgesic', 'antibiotic', 'antiviral', 'antifungal', 'cardiovascular', 'diabetes', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'hormonal', 'immunosuppressant', 'other']).optional().nullable(),
  defaultDosage: z.string().max(100).optional().nullable(),
  dosageForm: z.enum(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'drops', 'other']).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  requiresPrescription: z.boolean().optional(),
  isControlledSubstance: z.boolean().optional(),
  warnings: z.string().max(2000).optional().nullable(),
  contraindications: z.string().max(2000).optional().nullable(),
  sideEffects: z.string().max(2000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Create Prescription Schema
 * Used for POST /api/prescriptions
 */
export const createPrescriptionSchema = z.object({
  // Required relationships
  patientId: z.string().uuid('ID de paciente inválido'),
  medicationId: z.string().uuid('ID de medicamento inválido'),
  prescriberId: z.string().uuid('ID de prescriptor inválido'),

  // Prescription details
  dosage: z.string().min(1, 'Dosificación requerida').max(200, 'Dosificación muy larga'),
  frequency: z.string().min(1, 'Frecuencia requerida').max(100, 'Frecuencia muy larga'),
  route: routeSchema,
  duration: z.string().max(100, 'Duración muy larga').optional().nullable(),

  // Dates
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)').optional().nullable(),

  // Quantity and refills
  quantity: z.number().int().positive('Cantidad debe ser positiva').max(10000, 'Cantidad muy alta').optional().nullable(),
  refills: z.number().int().min(0, 'Refills no puede ser negativo').max(99, 'Demasiados refills').default(0),

  // Instructions and notes
  instructions: z.string().max(1000, 'Instrucciones muy largas').optional().nullable(),
  indication: z.string().max(500, 'Indicación muy larga').optional().nullable(),
  notes: z.string().max(1000, 'Notas muy largas').optional().nullable(),

  // Status
  status: z.enum(['active', 'completed', 'discontinued', 'on_hold'], {
    errorMap: () => ({ message: 'Estado inválido' }),
  }).default('active'),
  isPRN: z.boolean().default(false), // "As needed" medication
})
.refine(
  (data) => {
    if (data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
  }
);

/**
 * Update Prescription Schema
 * Used for PUT /api/prescriptions/[id]
 */
export const updatePrescriptionSchema = z.object({
  dosage: z.string().min(1).max(200).optional(),
  frequency: z.string().min(1).max(100).optional(),
  route: routeSchema.optional(),
  duration: z.string().max(100).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  quantity: z.number().int().positive().max(10000).optional().nullable(),
  refills: z.number().int().min(0).max(99).optional(),
  instructions: z.string().max(1000).optional().nullable(),
  indication: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['active', 'completed', 'discontinued', 'on_hold']).optional(),
  isPRN: z.boolean().optional(),
});

/**
 * Medication Query Params Schema
 * Used for GET /api/medications (list with filters)
 */
export const medicationQuerySchema = z.object({
  search: z.string().max(100).optional(),
  category: z.enum(['analgesic', 'antibiotic', 'antiviral', 'antifungal', 'cardiovascular', 'diabetes', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'hormonal', 'immunosuppressant', 'other']).optional(),
  requiresPrescription: z.enum(['true', 'false']).optional(),
  isControlledSubstance: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});

/**
 * Prescription Query Params Schema
 * Used for GET /api/prescriptions (list with filters)
 */
export const prescriptionQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  prescriberId: z.string().uuid().optional(),
  medicationId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'discontinued', 'on_hold']).optional(),
  isPRN: z.enum(['true', 'false']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});

// Export types for TypeScript
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type MedicationQueryInput = z.infer<typeof medicationQuerySchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type PrescriptionQueryInput = z.infer<typeof prescriptionQuerySchema>;
