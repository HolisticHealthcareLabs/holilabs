/**
 * Patient Validation Schemas
 *
 * Zod schemas for validating patient data on both client and server
 */

import { z } from 'zod';

// Brazilian CPF validation (11 digits)
const cpfSchema = z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
  message: 'CPF deve ter 11 dígitos (formato: 000.000.000-00 ou 00000000000)',
});

// Brazilian CNS validation (15 digits)
const cnsSchema = z.string().regex(/^\d{15}$/, {
  message: 'CNS deve ter 15 dígitos',
});

// Phone number validation (Brazilian format)
const phoneSchema = z.string().regex(/^(\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
  message: 'Telefone inválido (formato: (11) 98765-4321)',
});

/**
 * Create Patient Schema
 * Used for POST /api/patients
 */
export const createPatientSchema = z.object({
  // Required fields
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres').max(50, 'Sobrenome muito longo'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida (formato: YYYY-MM-DD)'),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Gênero inválido' }) }),

  // Optional contact fields
  email: z.string().email('Email inválido').optional().nullable(),
  phone: phoneSchema.optional().nullable(),

  // Optional address fields
  address: z.string().max(200, 'Endereço muito longo').optional().nullable(),
  city: z.string().max(100, 'Cidade muito longa').optional().nullable(),
  state: z.string().length(2, 'Estado deve ter 2 letras (ex: SP)').optional().nullable(),
  postalCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 12345-678)').optional().nullable(),
  country: z.string().length(2, 'País deve ter 2 letras (ex: BR)').default('BR'),

  // Brazilian health identifiers
  cpf: cpfSchema.optional().nullable(),
  cns: cnsSchema.optional().nullable(),

  // Healthcare fields
  externalMrn: z.string().max(50, 'MRN externo muito longo').optional().nullable(),
  assignedClinicianId: z.string().uuid('ID do clínico inválido').optional().nullable(),

  // Palliative care specific
  isPalliativeCare: z.boolean().default(false),
});

/**
 * Update Patient Schema
 * Used for PUT /api/patients/[id]
 * All fields are optional for partial updates
 */
export const updatePatientSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  email: z.string().email().optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  postalCode: z.string().regex(/^\d{5}-?\d{3}$/).optional().nullable(),
  country: z.string().length(2).optional(),
  cpf: cpfSchema.optional().nullable(),
  cns: cnsSchema.optional().nullable(),
  externalMrn: z.string().max(50).optional().nullable(),
  assignedClinicianId: z.string().uuid().optional().nullable(),
  isPalliativeCare: z.boolean().optional(),
});

/**
 * Patient Query Params Schema
 * Used for GET /api/patients (list with filters)
 */
export const patientQuerySchema = z.object({
  search: z.string().optional(),
  isPalliativeCare: z.enum(['true', 'false']).optional(),
  assignedClinicianId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});

// Export types for TypeScript
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
