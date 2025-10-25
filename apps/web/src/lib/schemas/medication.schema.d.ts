/**
 * Medication Validation Schemas
 *
 * Zod schemas for validating medication and prescription data
 */
import { z } from 'zod';
/**
 * Create Medication Schema
 * Used for POST /api/medications
 */
export declare const createMedicationSchema: z.ZodObject<{
    name: z.ZodString;
    genericName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodEnum<["analgesic", "antibiotic", "antiviral", "antifungal", "cardiovascular", "diabetes", "respiratory", "gastrointestinal", "neurological", "psychiatric", "hormonal", "immunosuppressant", "other"]>>>;
    defaultDosage: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dosageForm: z.ZodNullable<z.ZodOptional<z.ZodEnum<["tablet", "capsule", "liquid", "injection", "cream", "ointment", "inhaler", "patch", "drops", "other"]>>>;
    manufacturer: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    requiresPrescription: z.ZodDefault<z.ZodBoolean>;
    isControlledSubstance: z.ZodDefault<z.ZodBoolean>;
    warnings: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contraindications: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sideEffects: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    requiresPrescription: boolean;
    isControlledSubstance: boolean;
    category?: "other" | "cardiovascular" | "diabetes" | "analgesic" | "antibiotic" | "antiviral" | "antifungal" | "respiratory" | "gastrointestinal" | "neurological" | "psychiatric" | "hormonal" | "immunosuppressant" | null | undefined;
    notes?: string | null | undefined;
    sideEffects?: string | null | undefined;
    genericName?: string | null | undefined;
    defaultDosage?: string | null | undefined;
    dosageForm?: "patch" | "other" | "tablet" | "injection" | "capsule" | "liquid" | "cream" | "ointment" | "inhaler" | "drops" | null | undefined;
    manufacturer?: string | null | undefined;
    warnings?: string | null | undefined;
    contraindications?: string | null | undefined;
}, {
    name: string;
    category?: "other" | "cardiovascular" | "diabetes" | "analgesic" | "antibiotic" | "antiviral" | "antifungal" | "respiratory" | "gastrointestinal" | "neurological" | "psychiatric" | "hormonal" | "immunosuppressant" | null | undefined;
    notes?: string | null | undefined;
    isActive?: boolean | undefined;
    sideEffects?: string | null | undefined;
    genericName?: string | null | undefined;
    defaultDosage?: string | null | undefined;
    dosageForm?: "patch" | "other" | "tablet" | "injection" | "capsule" | "liquid" | "cream" | "ointment" | "inhaler" | "drops" | null | undefined;
    manufacturer?: string | null | undefined;
    requiresPrescription?: boolean | undefined;
    isControlledSubstance?: boolean | undefined;
    warnings?: string | null | undefined;
    contraindications?: string | null | undefined;
}>;
/**
 * Update Medication Schema
 * Used for PUT /api/medications/[id]
 */
export declare const updateMedicationSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    genericName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodEnum<["analgesic", "antibiotic", "antiviral", "antifungal", "cardiovascular", "diabetes", "respiratory", "gastrointestinal", "neurological", "psychiatric", "hormonal", "immunosuppressant", "other"]>>>;
    defaultDosage: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dosageForm: z.ZodNullable<z.ZodOptional<z.ZodEnum<["tablet", "capsule", "liquid", "injection", "cream", "ointment", "inhaler", "patch", "drops", "other"]>>>;
    manufacturer: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    requiresPrescription: z.ZodOptional<z.ZodBoolean>;
    isControlledSubstance: z.ZodOptional<z.ZodBoolean>;
    warnings: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contraindications: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sideEffects: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    category?: "other" | "cardiovascular" | "diabetes" | "analgesic" | "antibiotic" | "antiviral" | "antifungal" | "respiratory" | "gastrointestinal" | "neurological" | "psychiatric" | "hormonal" | "immunosuppressant" | null | undefined;
    notes?: string | null | undefined;
    isActive?: boolean | undefined;
    sideEffects?: string | null | undefined;
    genericName?: string | null | undefined;
    defaultDosage?: string | null | undefined;
    dosageForm?: "patch" | "other" | "tablet" | "injection" | "capsule" | "liquid" | "cream" | "ointment" | "inhaler" | "drops" | null | undefined;
    manufacturer?: string | null | undefined;
    requiresPrescription?: boolean | undefined;
    isControlledSubstance?: boolean | undefined;
    warnings?: string | null | undefined;
    contraindications?: string | null | undefined;
}, {
    name?: string | undefined;
    category?: "other" | "cardiovascular" | "diabetes" | "analgesic" | "antibiotic" | "antiviral" | "antifungal" | "respiratory" | "gastrointestinal" | "neurological" | "psychiatric" | "hormonal" | "immunosuppressant" | null | undefined;
    notes?: string | null | undefined;
    isActive?: boolean | undefined;
    sideEffects?: string | null | undefined;
    genericName?: string | null | undefined;
    defaultDosage?: string | null | undefined;
    dosageForm?: "patch" | "other" | "tablet" | "injection" | "capsule" | "liquid" | "cream" | "ointment" | "inhaler" | "drops" | null | undefined;
    manufacturer?: string | null | undefined;
    requiresPrescription?: boolean | undefined;
    isControlledSubstance?: boolean | undefined;
    warnings?: string | null | undefined;
    contraindications?: string | null | undefined;
}>;
/**
 * Create Prescription Schema
 * Used for POST /api/prescriptions
 */
export declare const createPrescriptionSchema: z.ZodEffects<z.ZodObject<{
    patientId: z.ZodString;
    medicationId: z.ZodString;
    prescriberId: z.ZodString;
    dosage: z.ZodString;
    frequency: z.ZodString;
    route: z.ZodEnum<["oral", "sublingual", "tópica", "intravenosa", "intramuscular", "subcutánea", "inhalatoria", "rectal", "oftálmica", "ótica", "nasal", "transdérmica"]>;
    duration: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodString;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quantity: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    refills: z.ZodDefault<z.ZodNumber>;
    instructions: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    indication: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "discontinued", "on_hold"]>>;
    isPRN: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "active" | "on_hold" | "discontinued";
    route: "oral" | "sublingual" | "tópica" | "intravenosa" | "intramuscular" | "subcutánea" | "inhalatoria" | "rectal" | "oftálmica" | "ótica" | "nasal" | "transdérmica";
    patientId: string;
    startDate: string;
    dosage: string;
    frequency: string;
    medicationId: string;
    prescriberId: string;
    refills: number;
    isPRN: boolean;
    duration?: string | null | undefined;
    endDate?: string | null | undefined;
    indication?: string | null | undefined;
    notes?: string | null | undefined;
    instructions?: string | null | undefined;
    quantity?: number | null | undefined;
}, {
    route: "oral" | "sublingual" | "tópica" | "intravenosa" | "intramuscular" | "subcutánea" | "inhalatoria" | "rectal" | "oftálmica" | "ótica" | "nasal" | "transdérmica";
    patientId: string;
    startDate: string;
    dosage: string;
    frequency: string;
    medicationId: string;
    prescriberId: string;
    status?: "completed" | "active" | "on_hold" | "discontinued" | undefined;
    duration?: string | null | undefined;
    endDate?: string | null | undefined;
    indication?: string | null | undefined;
    notes?: string | null | undefined;
    instructions?: string | null | undefined;
    quantity?: number | null | undefined;
    refills?: number | undefined;
    isPRN?: boolean | undefined;
}>, {
    status: "completed" | "active" | "on_hold" | "discontinued";
    route: "oral" | "sublingual" | "tópica" | "intravenosa" | "intramuscular" | "subcutánea" | "inhalatoria" | "rectal" | "oftálmica" | "ótica" | "nasal" | "transdérmica";
    patientId: string;
    startDate: string;
    dosage: string;
    frequency: string;
    medicationId: string;
    prescriberId: string;
    refills: number;
    isPRN: boolean;
    duration?: string | null | undefined;
    endDate?: string | null | undefined;
    indication?: string | null | undefined;
    notes?: string | null | undefined;
    instructions?: string | null | undefined;
    quantity?: number | null | undefined;
}, {
    route: "oral" | "sublingual" | "tópica" | "intravenosa" | "intramuscular" | "subcutánea" | "inhalatoria" | "rectal" | "oftálmica" | "ótica" | "nasal" | "transdérmica";
    patientId: string;
    startDate: string;
    dosage: string;
    frequency: string;
    medicationId: string;
    prescriberId: string;
    status?: "completed" | "active" | "on_hold" | "discontinued" | undefined;
    duration?: string | null | undefined;
    endDate?: string | null | undefined;
    indication?: string | null | undefined;
    notes?: string | null | undefined;
    instructions?: string | null | undefined;
    quantity?: number | null | undefined;
    refills?: number | undefined;
    isPRN?: boolean | undefined;
}>;
/**
 * Update Prescription Schema
 * Used for PUT /api/prescriptions/[id]
 */
export declare const updatePrescriptionSchema: z.ZodObject<{
    dosage: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodEnum<["oral", "sublingual", "tópica", "intravenosa", "intramuscular", "subcutánea", "inhalatoria", "rectal", "oftálmica", "ótica", "nasal", "transdérmica"]>>;
    duration: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    quantity: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    refills: z.ZodOptional<z.ZodNumber>;
    instructions: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    indication: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["active", "completed", "discontinued", "on_hold"]>>;
    isPRN: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status?: "completed" | "active" | "on_hold" | "discontinued" | undefined;
    duration?: string | null | undefined;
    route?: "oral" | "sublingual" | "tópica" | "intravenosa" | "intramuscular" | "subcutánea" | "inhalatoria" | "rectal" | "oftálmica" | "ótica" | "nasal" | "transdérmica" | undefined;
    startDate?: string | undefined;
    endDate?: string | null | undefined;
    indication?: string | null | undefined;
    notes?: string | null | undefined;
    instructions?: string | null | undefined;
    dosage?: string | undefined;
    frequency?: string | undefined;
    quantity?: number | null | undefined;
    refills?: number | undefined;
    isPRN?: boolean | undefined;
}, {
    status?: "completed" | "active" | "on_hold" | "discontinued" | undefined;
    duration?: string | null | undefined;
    route?: "oral" | "sublingual" | "tópica" | "intravenosa" | "intramuscular" | "subcutánea" | "inhalatoria" | "rectal" | "oftálmica" | "ótica" | "nasal" | "transdérmica" | undefined;
    startDate?: string | undefined;
    endDate?: string | null | undefined;
    indication?: string | null | undefined;
    notes?: string | null | undefined;
    instructions?: string | null | undefined;
    dosage?: string | undefined;
    frequency?: string | undefined;
    quantity?: number | null | undefined;
    refills?: number | undefined;
    isPRN?: boolean | undefined;
}>;
/**
 * Medication Query Params Schema
 * Used for GET /api/medications (list with filters)
 */
export declare const medicationQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["analgesic", "antibiotic", "antiviral", "antifungal", "cardiovascular", "diabetes", "respiratory", "gastrointestinal", "neurological", "psychiatric", "hormonal", "immunosuppressant", "other"]>>;
    requiresPrescription: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    isControlledSubstance: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    isActive: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    category?: "other" | "cardiovascular" | "diabetes" | "analgesic" | "antibiotic" | "antiviral" | "antifungal" | "respiratory" | "gastrointestinal" | "neurological" | "psychiatric" | "hormonal" | "immunosuppressant" | undefined;
    isActive?: "false" | "true" | undefined;
    requiresPrescription?: "false" | "true" | undefined;
    isControlledSubstance?: "false" | "true" | undefined;
}, {
    search?: string | undefined;
    limit?: string | undefined;
    category?: "other" | "cardiovascular" | "diabetes" | "analgesic" | "antibiotic" | "antiviral" | "antifungal" | "respiratory" | "gastrointestinal" | "neurological" | "psychiatric" | "hormonal" | "immunosuppressant" | undefined;
    page?: string | undefined;
    isActive?: "false" | "true" | undefined;
    requiresPrescription?: "false" | "true" | undefined;
    isControlledSubstance?: "false" | "true" | undefined;
}>;
/**
 * Prescription Query Params Schema
 * Used for GET /api/prescriptions (list with filters)
 */
export declare const prescriptionQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    prescriberId: z.ZodOptional<z.ZodString>;
    medicationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "completed", "discontinued", "on_hold"]>>;
    isPRN: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    status?: "completed" | "active" | "on_hold" | "discontinued" | undefined;
    patientId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    medicationId?: string | undefined;
    prescriberId?: string | undefined;
    isPRN?: "false" | "true" | undefined;
}, {
    status?: "completed" | "active" | "on_hold" | "discontinued" | undefined;
    limit?: string | undefined;
    patientId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: string | undefined;
    medicationId?: string | undefined;
    prescriberId?: string | undefined;
    isPRN?: "false" | "true" | undefined;
}>;
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type MedicationQueryInput = z.infer<typeof medicationQuerySchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type PrescriptionQueryInput = z.infer<typeof prescriptionQuerySchema>;
//# sourceMappingURL=medication.schema.d.ts.map