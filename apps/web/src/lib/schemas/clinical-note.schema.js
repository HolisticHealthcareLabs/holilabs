"use strict";
/**
 * Clinical Note Validation Schemas
 *
 * Zod schemas for validating SOAP notes and clinical documentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clinicalNoteQuerySchema = exports.updateClinicalNoteSchema = exports.createClinicalNoteSchema = void 0;
const zod_1 = require("zod");
// Vital signs validation with medical ranges
const vitalSignsSchema = zod_1.z.object({
    bloodPressure: zod_1.z.string().regex(/^\d{2,3}\/\d{2,3}$/, {
        message: 'Presión arterial inválida (formato: 120/80)',
    }).optional().nullable(),
    heartRate: zod_1.z.number().int().min(30, 'Frecuencia cardíaca muy baja').max(250, 'Frecuencia cardíaca muy alta').optional().nullable(),
    temperature: zod_1.z.number().min(32.0, 'Temperatura muy baja').max(43.0, 'Temperatura muy alta').optional().nullable(),
    respiratoryRate: zod_1.z.number().int().min(5, 'Frecuencia respiratoria muy baja').max(60, 'Frecuencia respiratoria muy alta').optional().nullable(),
    oxygenSaturation: zod_1.z.number().int().min(50, 'Saturación de oxígeno muy baja').max(100, 'Saturación de oxígeno inválida').optional().nullable(),
    weight: zod_1.z.number().min(0.5, 'Peso muy bajo').max(500, 'Peso muy alto').optional().nullable(),
}).optional().nullable();
// ICD-10 diagnosis code validation
const diagnosisSchema = zod_1.z.object({
    code: zod_1.z.string().regex(/^[A-Z]\d{2}(\.[A-Z0-9]{1,4})?$/, {
        message: 'Código ICD-10 inválido (formato: A00 o A00.0)',
    }),
    description: zod_1.z.string().min(3, 'Descripción muy corta').max(200, 'Descripción muy larga'),
});
// Procedure code validation (simplified)
const procedureSchema = zod_1.z.object({
    code: zod_1.z.string().min(2, 'Código de procedimiento inválido').max(20, 'Código muy largo'),
    description: zod_1.z.string().min(3, 'Descripción muy corta').max(200, 'Descripción muy larga'),
});
/**
 * Create Clinical Note Schema
 * Used for POST /api/clinical-notes
 */
exports.createClinicalNoteSchema = zod_1.z.object({
    // Required fields
    patientId: zod_1.z.string().uuid('ID de paciente inválido'),
    authorId: zod_1.z.string().uuid('ID de autor inválido'),
    type: zod_1.z.enum(['SOAP', 'Progress', 'Admission', 'Discharge', 'Procedure', 'Emergency'], {
        errorMap: () => ({ message: 'Tipo de nota inválido' }),
    }),
    // SOAP fields (all optional but at least one should be provided)
    subjective: zod_1.z.string().max(5000, 'Sección subjetiva muy larga').optional().nullable(),
    objective: zod_1.z.string().max(5000, 'Sección objetiva muy larga').optional().nullable(),
    assessment: zod_1.z.string().max(5000, 'Sección de evaluación muy larga').optional().nullable(),
    plan: zod_1.z.string().max(5000, 'Sección de plan muy larga').optional().nullable(),
    // Vital signs
    vitalSigns: vitalSignsSchema,
    // Diagnoses and procedures
    diagnoses: zod_1.z.array(diagnosisSchema).max(20, 'Demasiados diagnósticos').optional().nullable(),
    procedures: zod_1.z.array(procedureSchema).max(20, 'Demasiados procedimientos').optional().nullable(),
    // Metadata
    sessionId: zod_1.z.string().uuid('ID de sesión inválido').optional().nullable(),
    recordingDuration: zod_1.z.number().int().min(0).max(36000, 'Duración de grabación inválida').optional().nullable(), // Max 10 hours
}).refine((data) => data.subjective || data.objective || data.assessment || data.plan, {
    message: 'Debe proporcionar al menos una sección SOAP (Subjetivo, Objetivo, Evaluación, o Plan)',
});
/**
 * Update Clinical Note Schema
 * Used for PUT /api/clinical-notes/[id]
 * All fields optional for partial updates
 */
exports.updateClinicalNoteSchema = zod_1.z.object({
    type: zod_1.z.enum(['SOAP', 'Progress', 'Admission', 'Discharge', 'Procedure', 'Emergency']).optional(),
    subjective: zod_1.z.string().max(5000).optional().nullable(),
    objective: zod_1.z.string().max(5000).optional().nullable(),
    assessment: zod_1.z.string().max(5000).optional().nullable(),
    plan: zod_1.z.string().max(5000).optional().nullable(),
    vitalSigns: vitalSignsSchema,
    diagnoses: zod_1.z.array(diagnosisSchema).max(20).optional().nullable(),
    procedures: zod_1.z.array(procedureSchema).max(20).optional().nullable(),
    dataHash: zod_1.z.string().length(64, 'Hash de datos inválido (debe ser SHA-256)').optional().nullable(),
});
/**
 * Clinical Note Query Params Schema
 * Used for GET /api/clinical-notes (list with filters)
 */
exports.clinicalNoteQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().uuid('ID de paciente inválido').optional(),
    authorId: zod_1.z.string().uuid('ID de autor inválido').optional(),
    type: zod_1.z.enum(['SOAP', 'Progress', 'Admission', 'Discharge', 'Procedure', 'Emergency']).optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)').optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)').optional(),
    search: zod_1.z.string().max(100, 'Búsqueda muy larga').optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive()).default('1'),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive().max(100)).default('20'),
});
//# sourceMappingURL=clinical-note.schema.js.map