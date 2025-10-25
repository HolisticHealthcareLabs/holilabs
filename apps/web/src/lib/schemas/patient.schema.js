"use strict";
/**
 * Patient Validation Schemas
 *
 * Zod schemas for validating patient data on both client and server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientQuerySchema = exports.updatePatientSchema = exports.createPatientSchema = void 0;
const zod_1 = require("zod");
// Brazilian CPF validation (11 digits)
const cpfSchema = zod_1.z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve ter 11 dígitos (formato: 000.000.000-00 ou 00000000000)',
});
// Brazilian CNS validation (15 digits)
const cnsSchema = zod_1.z.string().regex(/^\d{15}$/, {
    message: 'CNS deve ter 15 dígitos',
});
// Phone number validation (Brazilian format)
const phoneSchema = zod_1.z.string().regex(/^(\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
    message: 'Telefone inválido (formato: (11) 98765-4321)',
});
/**
 * Create Patient Schema
 * Used for POST /api/patients
 */
exports.createPatientSchema = zod_1.z.object({
    // Required fields
    firstName: zod_1.z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
    lastName: zod_1.z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres').max(50, 'Sobrenome muito longo'),
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida (formato: YYYY-MM-DD)'),
    gender: zod_1.z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Gênero inválido' }) }),
    // Optional contact fields
    email: zod_1.z.string().email('Email inválido').optional().nullable(),
    phone: phoneSchema.optional().nullable(),
    // Optional address fields
    address: zod_1.z.string().max(200, 'Endereço muito longo').optional().nullable(),
    city: zod_1.z.string().max(100, 'Cidade muito longa').optional().nullable(),
    state: zod_1.z.string().length(2, 'Estado deve ter 2 letras (ex: SP)').optional().nullable(),
    postalCode: zod_1.z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 12345-678)').optional().nullable(),
    country: zod_1.z.string().length(2, 'País deve ter 2 letras (ex: BR)').default('BR'),
    // Brazilian health identifiers
    cpf: cpfSchema.optional().nullable(),
    cns: cnsSchema.optional().nullable(),
    // Healthcare fields
    externalMrn: zod_1.z.string().max(50, 'MRN externo muito longo').optional().nullable(),
    assignedClinicianId: zod_1.z.string().uuid('ID do clínico inválido').optional().nullable(),
    // Palliative care specific
    isPalliativeCare: zod_1.z.boolean().default(false),
});
/**
 * Update Patient Schema
 * Used for PUT /api/patients/[id]
 * All fields are optional for partial updates
 */
exports.updatePatientSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2).max(50).optional(),
    lastName: zod_1.z.string().min(2).max(50).optional(),
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
    email: zod_1.z.string().email().optional().nullable(),
    phone: phoneSchema.optional().nullable(),
    address: zod_1.z.string().max(200).optional().nullable(),
    city: zod_1.z.string().max(100).optional().nullable(),
    state: zod_1.z.string().length(2).optional().nullable(),
    postalCode: zod_1.z.string().regex(/^\d{5}-?\d{3}$/).optional().nullable(),
    country: zod_1.z.string().length(2).optional(),
    cpf: cpfSchema.optional().nullable(),
    cns: cnsSchema.optional().nullable(),
    externalMrn: zod_1.z.string().max(50).optional().nullable(),
    assignedClinicianId: zod_1.z.string().uuid().optional().nullable(),
    isPalliativeCare: zod_1.z.boolean().optional(),
});
/**
 * Patient Query Params Schema
 * Used for GET /api/patients (list with filters)
 */
exports.patientQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    isPalliativeCare: zod_1.z.enum(['true', 'false']).optional(),
    assignedClinicianId: zod_1.z.string().uuid().optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive()).default('1'),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).pipe(zod_1.z.number().int().positive().max(100)).default('20'),
});
//# sourceMappingURL=patient.schema.js.map