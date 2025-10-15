/**
 * Care Plan Validation Schemas
 *
 * Zod schemas for validating care plans and goals
 */

import { z } from 'zod';

// Goal validation
const goalSchema = z.object({
  title: z.string().min(5, 'Título muy corto').max(200, 'Título muy largo'),
  description: z.string().max(1000, 'Descripción muy larga').optional().nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha objetivo inválida (formato: YYYY-MM-DD)').optional().nullable(),
  status: z.enum(['not_started', 'in_progress', 'achieved', 'abandoned'], {
    errorMap: () => ({ message: 'Estado de objetivo inválido' }),
  }).default('not_started'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Prioridad inválida' }),
  }).default('medium'),
});

// Intervention validation
const interventionSchema = z.object({
  title: z.string().min(5, 'Título muy corto').max(200, 'Título muy largo'),
  description: z.string().max(2000, 'Descripción muy larga').optional().nullable(),
  frequency: z.string().max(100, 'Frecuencia muy larga').optional().nullable(),
  assignedTo: z.string().uuid('ID de asignado inválido').optional().nullable(),
  status: z.enum(['pending', 'active', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Estado de intervención inválido' }),
  }).default('pending'),
});

/**
 * Create Care Plan Schema
 * Used for POST /api/care-plans
 */
export const createCarePlanSchema = z.object({
  // Required fields
  patientId: z.string().uuid('ID de paciente inválido'),
  title: z.string().min(5, 'Título muy corto').max(200, 'Título muy largo'),
  authorId: z.string().uuid('ID de autor inválido'),

  // Care plan details
  description: z.string().max(5000, 'Descripción muy larga').optional().nullable(),
  category: z.enum([
    'palliative',
    'chronic_disease',
    'post_operative',
    'rehabilitation',
    'preventive',
    'mental_health',
    'maternal_child',
    'geriatric',
    'acute_care',
    'other'
  ], {
    errorMap: () => ({ message: 'Categoría inválida' }),
  }).optional().nullable(),

  // Dates
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)').optional().nullable(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de revisión inválida (formato: YYYY-MM-DD)').optional().nullable(),

  // Status
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Estado inválido' }),
  }).default('draft'),

  // Goals and interventions
  goals: z.array(goalSchema).max(50, 'Demasiados objetivos').optional().nullable(),
  interventions: z.array(interventionSchema).max(100, 'Demasiadas intervenciones').optional().nullable(),

  // Team
  careTeam: z.array(z.string().uuid('ID de miembro del equipo inválido')).max(50, 'Equipo de cuidado muy grande').optional().nullable(),

  // Notes
  notes: z.string().max(5000, 'Notas muy largas').optional().nullable(),
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
)
.refine(
  (data) => {
    if (data.reviewDate) {
      return new Date(data.reviewDate) >= new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'La fecha de revisión debe ser posterior a la fecha de inicio',
    path: ['reviewDate'],
  }
);

/**
 * Update Care Plan Schema
 * Used for PUT /api/care-plans/[id]
 */
export const updateCarePlanSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  category: z.enum([
    'palliative',
    'chronic_disease',
    'post_operative',
    'rehabilitation',
    'preventive',
    'mental_health',
    'maternal_child',
    'geriatric',
    'acute_care',
    'other'
  ]).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  goals: z.array(goalSchema).max(50).optional().nullable(),
  interventions: z.array(interventionSchema).max(100).optional().nullable(),
  careTeam: z.array(z.string().uuid()).max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})
.refine(
  (data) => {
    if (data.endDate && data.startDate) {
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
 * Care Plan Query Params Schema
 * Used for GET /api/care-plans (list with filters)
 */
export const carePlanQuerySchema = z.object({
  patientId: z.string().uuid('ID de paciente inválido').optional(),
  authorId: z.string().uuid('ID de autor inválido').optional(),
  category: z.enum([
    'palliative',
    'chronic_disease',
    'post_operative',
    'rehabilitation',
    'preventive',
    'mental_health',
    'maternal_child',
    'geriatric',
    'acute_care',
    'other'
  ]).optional(),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(100).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('20'),
});

/**
 * Goal Update Schema
 * For updating individual goals within a care plan
 */
export const updateGoalSchema = goalSchema.partial();

/**
 * Intervention Update Schema
 * For updating individual interventions within a care plan
 */
export const updateInterventionSchema = interventionSchema.partial();

// Export types for TypeScript
export type CreateCarePlanInput = z.infer<typeof createCarePlanSchema>;
export type UpdateCarePlanInput = z.infer<typeof updateCarePlanSchema>;
export type CarePlanQueryInput = z.infer<typeof carePlanQuerySchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UpdateInterventionInput = z.infer<typeof updateInterventionSchema>;
