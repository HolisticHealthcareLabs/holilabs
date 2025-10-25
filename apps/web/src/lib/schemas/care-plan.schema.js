"use strict";
/**
 * Care Plan Validation Schemas
 *
 * Zod schemas for validating care plans and goals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInterventionSchema = exports.updateGoalSchema = exports.carePlanQuerySchema = exports.updateCarePlanSchema = exports.createCarePlanSchema = void 0;
const zod_1 = require("zod");
// Goal validation
const goalSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, 'Título muy corto').max(200, 'Título muy largo'),
    description: zod_1.z.string().max(1000, 'Descripción muy larga').optional().nullable(),
    targetDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha objetivo inválida (formato: YYYY-MM-DD)').optional().nullable(),
    status: zod_1.z.enum(['not_started', 'in_progress', 'achieved', 'abandoned'], {
        errorMap: () => ({ message: 'Estado de objetivo inválido' }),
    }).default('not_started'),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent'], {
        errorMap: () => ({ message: 'Prioridad inválida' }),
    }).default('medium'),
});
// Intervention validation
const interventionSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, 'Título muy corto').max(200, 'Título muy largo'),
    description: zod_1.z.string().max(2000, 'Descripción muy larga').optional().nullable(),
    frequency: zod_1.z.string().max(100, 'Frecuencia muy larga').optional().nullable(),
    assignedTo: zod_1.z.string().uuid('ID de asignado inválido').optional().nullable(),
    status: zod_1.z.enum(['pending', 'active', 'completed', 'cancelled'], {
        errorMap: () => ({ message: 'Estado de intervención inválido' }),
    }).default('pending'),
});
/**
 * Create Care Plan Schema
 * Used for POST /api/care-plans
 */
exports.createCarePlanSchema = zod_1.z.object({
    // Required fields
    patientId: zod_1.z.string().uuid('ID de paciente inválido'),
    title: zod_1.z.string().min(5, 'Título muy corto').max(200, 'Título muy largo'),
    authorId: zod_1.z.string().uuid('ID de autor inválido'),
    // Care plan details
    description: zod_1.z.string().max(5000, 'Descripción muy larga').optional().nullable(),
    category: zod_1.z.enum([
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
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)').optional().nullable(),
    reviewDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de revisión inválida (formato: YYYY-MM-DD)').optional().nullable(),
    // Status
    status: zod_1.z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled'], {
        errorMap: () => ({ message: 'Estado inválido' }),
    }).default('draft'),
    // Goals and interventions
    goals: zod_1.z.array(goalSchema).max(50, 'Demasiados objetivos').optional().nullable(),
    interventions: zod_1.z.array(interventionSchema).max(100, 'Demasiadas intervenciones').optional().nullable(),
    // Team
    careTeam: zod_1.z.array(zod_1.z.string().uuid('ID de miembro del equipo inválido')).max(50, 'Equipo de cuidado muy grande').optional().nullable(),
    // Notes
    notes: zod_1.z.string().max(5000, 'Notas muy largas').optional().nullable(),
})
    .refine((data) => {
    if (data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
})
    .refine((data) => {
    if (data.reviewDate) {
        return new Date(data.reviewDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: 'La fecha de revisión debe ser posterior a la fecha de inicio',
    path: ['reviewDate'],
});
/**
 * Update Care Plan Schema
 * Used for PUT /api/care-plans/[id]
 */
exports.updateCarePlanSchema = zod_1.z.object({
    title: zod_1.z.string().min(5).max(200).optional(),
    description: zod_1.z.string().max(5000).optional().nullable(),
    category: zod_1.z.enum([
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
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    reviewDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status: zod_1.z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    goals: zod_1.z.array(goalSchema).max(50).optional().nullable(),
    interventions: zod_1.z.array(interventionSchema).max(100).optional().nullable(),
    careTeam: zod_1.z.array(zod_1.z.string().uuid()).max(50).optional().nullable(),
    notes: zod_1.z.string().max(5000).optional().nullable(),
})
    .refine((data) => {
    if (data.endDate && data.startDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
});
/**
 * Care Plan Query Params Schema
 * Used for GET /api/care-plans (list with filters)
 */
exports.carePlanQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().uuid('ID de paciente inválido').optional(),
    authorId: zod_1.z.string().uuid('ID de autor inválido').optional(),
    category: zod_1.z.enum([
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
    status: zod_1.z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: zod_1.z.string().max(100).optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive()).default('1'),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive().max(100)).default('20'),
});
/**
 * Goal Update Schema
 * For updating individual goals within a care plan
 */
exports.updateGoalSchema = goalSchema.partial();
/**
 * Intervention Update Schema
 * For updating individual interventions within a care plan
 */
exports.updateInterventionSchema = interventionSchema.partial();
//# sourceMappingURL=care-plan.schema.js.map