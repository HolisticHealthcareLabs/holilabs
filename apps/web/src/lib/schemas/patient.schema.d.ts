/**
 * Patient Validation Schemas
 *
 * Zod schemas for validating patient data on both client and server
 */
import { z } from 'zod';
/**
 * Create Patient Schema
 * Used for POST /api/patients
 */
export declare const createPatientSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    dateOfBirth: z.ZodString;
    gender: z.ZodEnum<["male", "female", "other"]>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    state: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    postalCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    country: z.ZodDefault<z.ZodString>;
    cpf: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cns: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    externalMrn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedClinicianId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isPalliativeCare: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    country: string;
    gender: "male" | "female" | "other";
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    isPalliativeCare: boolean;
    email?: string | null | undefined;
    state?: string | null | undefined;
    address?: string | null | undefined;
    postalCode?: string | null | undefined;
    assignedClinicianId?: string | null | undefined;
    phone?: string | null | undefined;
    city?: string | null | undefined;
    externalMrn?: string | null | undefined;
    cpf?: string | null | undefined;
    cns?: string | null | undefined;
}, {
    gender: "male" | "female" | "other";
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email?: string | null | undefined;
    state?: string | null | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    postalCode?: string | null | undefined;
    assignedClinicianId?: string | null | undefined;
    phone?: string | null | undefined;
    city?: string | null | undefined;
    externalMrn?: string | null | undefined;
    cpf?: string | null | undefined;
    cns?: string | null | undefined;
    isPalliativeCare?: boolean | undefined;
}>;
/**
 * Update Patient Schema
 * Used for PUT /api/patients/[id]
 * All fields are optional for partial updates
 */
export declare const updatePatientSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "other"]>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    city: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    state: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    postalCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodString>;
    cpf: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    cns: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    externalMrn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedClinicianId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isPalliativeCare: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string | null | undefined;
    state?: string | null | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    gender?: "male" | "female" | "other" | undefined;
    postalCode?: string | null | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | undefined;
    assignedClinicianId?: string | null | undefined;
    phone?: string | null | undefined;
    city?: string | null | undefined;
    externalMrn?: string | null | undefined;
    cpf?: string | null | undefined;
    cns?: string | null | undefined;
    isPalliativeCare?: boolean | undefined;
}, {
    email?: string | null | undefined;
    state?: string | null | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    gender?: "male" | "female" | "other" | undefined;
    postalCode?: string | null | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | undefined;
    assignedClinicianId?: string | null | undefined;
    phone?: string | null | undefined;
    city?: string | null | undefined;
    externalMrn?: string | null | undefined;
    cpf?: string | null | undefined;
    cns?: string | null | undefined;
    isPalliativeCare?: boolean | undefined;
}>;
/**
 * Patient Query Params Schema
 * Used for GET /api/patients (list with filters)
 */
export declare const patientQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    isPalliativeCare: z.ZodOptional<z.ZodEnum<["true", "false"]>>;
    assignedClinicianId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    assignedClinicianId?: string | undefined;
    isPalliativeCare?: "false" | "true" | undefined;
}, {
    search?: string | undefined;
    limit?: string | undefined;
    assignedClinicianId?: string | undefined;
    page?: string | undefined;
    isPalliativeCare?: "false" | "true" | undefined;
}>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
//# sourceMappingURL=patient.schema.d.ts.map