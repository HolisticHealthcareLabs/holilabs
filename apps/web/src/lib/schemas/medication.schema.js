"use strict";
/**
 * Medication Validation Schemas
 *
 * Zod schemas for validating medication and prescription data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prescriptionQuerySchema = exports.medicationQuerySchema = exports.updatePrescriptionSchema = exports.createPrescriptionSchema = exports.updateMedicationSchema = exports.createMedicationSchema = void 0;
const zod_1 = require("zod");
// Dosage validation
const dosageSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Cantidad debe ser positiva').max(10000, 'Cantidad muy alta'),
    unit: zod_1.z.enum(['mg', 'g', 'mcg', 'ml', 'L', 'UI', 'comprimido', 'cápsula', 'gota', 'aplicación'], {
        errorMap: () => ({ message: 'Unidad de dosificación inválida' }),
    }),
});
// Frequency validation
const frequencySchema = zod_1.z.enum(['una vez al día', 'dos veces al día', 'tres veces al día', 'cuatro veces al día', 'cada 4 horas', 'cada 6 horas', 'cada 8 horas', 'cada 12 horas', 'según sea necesario', 'antes de dormir', 'en ayunas', 'con alimentos'], {
    errorMap: () => ({ message: 'Frecuencia inválida' }),
});
// Route of administration
const routeSchema = zod_1.z.enum(['oral', 'sublingual', 'tópica', 'intravenosa', 'intramuscular', 'subcutánea', 'inhalatoria', 'rectal', 'oftálmica', 'ótica', 'nasal', 'transdérmica'], {
    errorMap: () => ({ message: 'Vía de administración inválida' }),
});
/**
 * Create Medication Schema
 * Used for POST /api/medications
 */
exports.createMedicationSchema = zod_1.z.object({
    // Required fields
    name: zod_1.z.string().min(2, 'Nombre muy corto').max(200, 'Nombre muy largo'),
    genericName: zod_1.z.string().min(2, 'Nombre genérico muy corto').max(200, 'Nombre genérico muy largo').optional().nullable(),
    // Classification
    category: zod_1.z.enum(['analgesic', 'antibiotic', 'antiviral', 'antifungal', 'cardiovascular', 'diabetes', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'hormonal', 'immunosuppressant', 'other'], { errorMap: () => ({ message: 'Categoría inválida' }) }).optional().nullable(),
    // Dosage information
    defaultDosage: zod_1.z.string().max(100, 'Dosificación muy larga').optional().nullable(),
    dosageForm: zod_1.z.enum(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'drops', 'other'], {
        errorMap: () => ({ message: 'Forma de dosificación inválida' }),
    }).optional().nullable(),
    // Additional information
    manufacturer: zod_1.z.string().max(100, 'Nombre de fabricante muy largo').optional().nullable(),
    requiresPrescription: zod_1.z.boolean().default(true),
    isControlledSubstance: zod_1.z.boolean().default(false),
    // Warnings and contraindications
    warnings: zod_1.z.string().max(2000, 'Advertencias muy largas').optional().nullable(),
    contraindications: zod_1.z.string().max(2000, 'Contraindicaciones muy largas').optional().nullable(),
    sideEffects: zod_1.z.string().max(2000, 'Efectos secundarios muy largos').optional().nullable(),
    // Metadata
    notes: zod_1.z.string().max(1000, 'Notas muy largas').optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
/**
 * Update Medication Schema
 * Used for PUT /api/medications/[id]
 */
exports.updateMedicationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200).optional(),
    genericName: zod_1.z.string().min(2).max(200).optional().nullable(),
    category: zod_1.z.enum(['analgesic', 'antibiotic', 'antiviral', 'antifungal', 'cardiovascular', 'diabetes', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'hormonal', 'immunosuppressant', 'other']).optional().nullable(),
    defaultDosage: zod_1.z.string().max(100).optional().nullable(),
    dosageForm: zod_1.z.enum(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'drops', 'other']).optional().nullable(),
    manufacturer: zod_1.z.string().max(100).optional().nullable(),
    requiresPrescription: zod_1.z.boolean().optional(),
    isControlledSubstance: zod_1.z.boolean().optional(),
    warnings: zod_1.z.string().max(2000).optional().nullable(),
    contraindications: zod_1.z.string().max(2000).optional().nullable(),
    sideEffects: zod_1.z.string().max(2000).optional().nullable(),
    notes: zod_1.z.string().max(1000).optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
/**
 * Create Prescription Schema
 * Used for POST /api/prescriptions
 */
exports.createPrescriptionSchema = zod_1.z.object({
    // Required relationships
    patientId: zod_1.z.string().uuid('ID de paciente inválido'),
    medicationId: zod_1.z.string().uuid('ID de medicamento inválido'),
    prescriberId: zod_1.z.string().uuid('ID de prescriptor inválido'),
    // Prescription details
    dosage: zod_1.z.string().min(1, 'Dosificación requerida').max(200, 'Dosificación muy larga'),
    frequency: zod_1.z.string().min(1, 'Frecuencia requerida').max(100, 'Frecuencia muy larga'),
    route: routeSchema,
    duration: zod_1.z.string().max(100, 'Duración muy larga').optional().nullable(),
    // Dates
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)').optional().nullable(),
    // Quantity and refills
    quantity: zod_1.z.number().int().positive('Cantidad debe ser positiva').max(10000, 'Cantidad muy alta').optional().nullable(),
    refills: zod_1.z.number().int().min(0, 'Refills no puede ser negativo').max(99, 'Demasiados refills').default(0),
    // Instructions and notes
    instructions: zod_1.z.string().max(1000, 'Instrucciones muy largas').optional().nullable(),
    indication: zod_1.z.string().max(500, 'Indicación muy larga').optional().nullable(),
    notes: zod_1.z.string().max(1000, 'Notas muy largas').optional().nullable(),
    // Status
    status: zod_1.z.enum(['active', 'completed', 'discontinued', 'on_hold'], {
        errorMap: () => ({ message: 'Estado inválido' }),
    }).default('active'),
    isPRN: zod_1.z.boolean().default(false), // "As needed" medication
})
    .refine((data) => {
    if (data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['endDate'],
});
/**
 * Update Prescription Schema
 * Used for PUT /api/prescriptions/[id]
 */
exports.updatePrescriptionSchema = zod_1.z.object({
    dosage: zod_1.z.string().min(1).max(200).optional(),
    frequency: zod_1.z.string().min(1).max(100).optional(),
    route: routeSchema.optional(),
    duration: zod_1.z.string().max(100).optional().nullable(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    quantity: zod_1.z.number().int().positive().max(10000).optional().nullable(),
    refills: zod_1.z.number().int().min(0).max(99).optional(),
    instructions: zod_1.z.string().max(1000).optional().nullable(),
    indication: zod_1.z.string().max(500).optional().nullable(),
    notes: zod_1.z.string().max(1000).optional().nullable(),
    status: zod_1.z.enum(['active', 'completed', 'discontinued', 'on_hold']).optional(),
    isPRN: zod_1.z.boolean().optional(),
});
/**
 * Medication Query Params Schema
 * Used for GET /api/medications (list with filters)
 */
exports.medicationQuerySchema = zod_1.z.object({
    search: zod_1.z.string().max(100).optional(),
    category: zod_1.z.enum(['analgesic', 'antibiotic', 'antiviral', 'antifungal', 'cardiovascular', 'diabetes', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'hormonal', 'immunosuppressant', 'other']).optional(),
    requiresPrescription: zod_1.z.enum(['true', 'false']).optional(),
    isControlledSubstance: zod_1.z.enum(['true', 'false']).optional(),
    isActive: zod_1.z.enum(['true', 'false']).optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive()).default('1'),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive().max(100)).default('20'),
});
/**
 * Prescription Query Params Schema
 * Used for GET /api/prescriptions (list with filters)
 */
exports.prescriptionQuerySchema = zod_1.z.object({
    patientId: zod_1.z.string().uuid().optional(),
    prescriberId: zod_1.z.string().uuid().optional(),
    medicationId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['active', 'completed', 'discontinued', 'on_hold']).optional(),
    isPRN: zod_1.z.enum(['true', 'false']).optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive()).default('1'),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive().max(100)).default('20'),
});
//# sourceMappingURL=medication.schema.js.map