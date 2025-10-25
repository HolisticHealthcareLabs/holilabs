/**
 * Medical-Grade Input Validation Schemas
 * Industry-Standard Validation for Healthcare Data
 *
 * Standards:
 * - ICD-10 code format validation
 * - CPT code format validation
 * - Vital signs physiological ranges (WHO standards)
 * - HIPAA-compliant PHI validation
 * - E.164 phone number format (international)
 * - RFC 5322 email validation
 */
import { z } from 'zod';
export declare const VITAL_SIGNS_RANGES: {
    systolicBP: {
        min: number;
        max: number;
    };
    diastolicBP: {
        min: number;
        max: number;
    };
    heartRate: {
        min: number;
        max: number;
    };
    temperature: {
        min: number;
        max: number;
    };
    respiratoryRate: {
        min: number;
        max: number;
    };
    spo2: {
        min: number;
        max: number;
    };
    weight: {
        min: number;
        max: number;
    };
    height: {
        min: number;
        max: number;
    };
};
export declare const FIELD_LIMITS: {
    name: {
        min: number;
        max: number;
    };
    email: {
        max: number;
    };
    phone: {
        min: number;
        max: number;
    };
    address: {
        max: number;
    };
    chiefComplaint: {
        max: number;
    };
    soapSection: {
        max: number;
    };
    medicationName: {
        max: number;
    };
    dosage: {
        max: number;
    };
    instructions: {
        max: number;
    };
    icd10: {
        length: number[];
    };
    cpt: {
        length: number;
    };
    audioSize: {
        min: number;
        max: number;
    };
    audioDuration: {
        min: number;
        max: number;
    };
};
/**
 * Validate ICD-10 code format
 * Format: Letter + 2 digits + optional decimal + 1-2 digits
 * Examples: J06, J06.9, E11.65
 */
export declare const icd10CodeValidator: z.ZodString;
/**
 * Validate CPT code format
 * Format: Exactly 5 digits
 * Examples: 99213, 99214, 80061
 */
export declare const cptCodeValidator: z.ZodString;
/**
 * Validate phone number (E.164 format)
 * Accepts: +52 555 123 4567, +1-555-123-4567, (555) 123-4567, 5551234567, etc.
 * Very permissive - accepts any reasonable phone format
 */
export declare const phoneValidator: z.ZodNullable<z.ZodOptional<z.ZodString>>;
/**
 * Validate email (RFC 5322 compliant)
 */
export declare const emailValidator: z.ZodNullable<z.ZodOptional<z.ZodString>>;
/**
 * Validate person name (letters, spaces, hyphens, apostrophes only)
 */
export declare const nameValidator: z.ZodString;
/**
 * Validate MRN (Medical Record Number)
 * Format: 6-20 alphanumeric characters
 */
export declare const mrnValidator: z.ZodString;
/**
 * Blood Pressure validator
 * Format: "systolic/diastolic" (e.g., "120/80")
 */
export declare const bloodPressureValidator: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
/**
 * Heart Rate validator
 */
export declare const heartRateValidator: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
/**
 * Temperature validator (Celsius)
 * Also accepts Fahrenheit and auto-converts
 */
export declare const temperatureValidator: z.ZodOptional<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodNumber, number, number>, z.ZodNumber>, z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>]>>;
/**
 * Respiratory Rate validator
 */
export declare const respiratoryRateValidator: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
/**
 * SpO2 (Oxygen Saturation) validator
 */
export declare const spo2Validator: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
/**
 * Weight validator (kg)
 */
export declare const weightValidator: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
/**
 * Vital Signs composite schema
 */
export declare const VitalSignsSchema: z.ZodOptional<z.ZodObject<{
    bp: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    hr: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
    temp: z.ZodOptional<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodNumber, number, number>, z.ZodNumber>, z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>]>>;
    rr: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
    spo2: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
    weight: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
}, "strip", z.ZodTypeAny, {
    hr?: number | undefined;
    temp?: number | undefined;
    rr?: number | undefined;
    bp?: string | undefined;
    weight?: number | undefined;
    spo2?: number | undefined;
}, {
    hr?: string | number | undefined;
    temp?: string | number | undefined;
    rr?: string | number | undefined;
    bp?: string | undefined;
    weight?: string | number | undefined;
    spo2?: string | number | undefined;
}>>;
export declare const cnsValidator: z.ZodOptional<z.ZodString>;
export declare const cpfValidator: z.ZodOptional<z.ZodString>;
export declare const cnesValidator: z.ZodOptional<z.ZodString>;
export declare const ibgeCodeValidator: z.ZodOptional<z.ZodString>;
export declare const CreatePatientSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    dateOfBirth: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, string | Date, string | Date>;
    mrn: z.ZodString;
    externalMrn: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<["M", "F", "O", "U"]>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodOptional<z.ZodString>;
    country: z.ZodDefault<z.ZodString>;
    ageBand: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    cns: z.ZodOptional<z.ZodString>;
    cpf: z.ZodOptional<z.ZodString>;
    rg: z.ZodOptional<z.ZodString>;
    municipalityCode: z.ZodOptional<z.ZodString>;
    healthUnitCNES: z.ZodOptional<z.ZodString>;
    susPacientId: z.ZodOptional<z.ZodString>;
    isPalliativeCare: z.ZodDefault<z.ZodBoolean>;
    comfortCareOnly: z.ZodDefault<z.ZodBoolean>;
    advanceDirectivesStatus: z.ZodOptional<z.ZodEnum<["NOT_COMPLETED", "IN_PROGRESS", "COMPLETED", "REVIEWED_ANNUALLY"]>>;
    advanceDirectivesDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    advanceDirectivesNotes: z.ZodOptional<z.ZodString>;
    dnrStatus: z.ZodDefault<z.ZodBoolean>;
    dnrDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    dniStatus: z.ZodDefault<z.ZodBoolean>;
    dniDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    codeStatus: z.ZodOptional<z.ZodEnum<["FULL_CODE", "DNR", "DNI", "DNR_DNI", "COMFORT_CARE_ONLY", "AND"]>>;
    primaryCaregiverId: z.ZodOptional<z.ZodString>;
    qualityOfLifeScore: z.ZodOptional<z.ZodNumber>;
    lastQoLAssessment: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    religiousAffiliation: z.ZodOptional<z.ZodString>;
    spiritualCareNeeds: z.ZodOptional<z.ZodString>;
    chaplainAssigned: z.ZodDefault<z.ZodBoolean>;
    primaryContactName: z.ZodOptional<z.ZodString>;
    primaryContactRelation: z.ZodOptional<z.ZodString>;
    primaryContactPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    primaryContactEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    primaryContactAddress: z.ZodOptional<z.ZodString>;
    secondaryContactName: z.ZodOptional<z.ZodString>;
    secondaryContactRelation: z.ZodOptional<z.ZodString>;
    secondaryContactPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    secondaryContactEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    emergencyContactName: z.ZodOptional<z.ZodString>;
    emergencyContactPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    emergencyContactRelation: z.ZodOptional<z.ZodString>;
    familyPortalEnabled: z.ZodDefault<z.ZodBoolean>;
    photoUrl: z.ZodOptional<z.ZodString>;
    photoConsentDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    photoConsentBy: z.ZodOptional<z.ZodString>;
    preferredName: z.ZodOptional<z.ZodString>;
    pronouns: z.ZodOptional<z.ZodString>;
    culturalPreferences: z.ZodOptional<z.ZodString>;
    hasSpecialNeeds: z.ZodDefault<z.ZodBoolean>;
    specialNeedsType: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    communicationNeeds: z.ZodOptional<z.ZodString>;
    mobilityNeeds: z.ZodOptional<z.ZodString>;
    dietaryNeeds: z.ZodOptional<z.ZodString>;
    sensoryNeeds: z.ZodOptional<z.ZodString>;
    careTeamNotes: z.ZodOptional<z.ZodString>;
    flaggedConcerns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    assignedClinicianId: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    country: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    mrn: string;
    isPalliativeCare: boolean;
    comfortCareOnly: boolean;
    dnrStatus: boolean;
    dniStatus: boolean;
    chaplainAssigned: boolean;
    familyPortalEnabled: boolean;
    hasSpecialNeeds: boolean;
    email?: string | null | undefined;
    state?: string | undefined;
    address?: string | null | undefined;
    gender?: "O" | "F" | "M" | "U" | undefined;
    region?: string | undefined;
    postalCode?: string | undefined;
    secondaryContactName?: string | undefined;
    advanceDirectivesStatus?: "COMPLETED" | "IN_PROGRESS" | "NOT_COMPLETED" | "REVIEWED_ANNUALLY" | undefined;
    specialNeedsType?: string[] | undefined;
    sensoryNeeds?: string | undefined;
    advanceDirectivesDate?: string | Date | undefined;
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    externalMrn?: string | undefined;
    cpf?: string | undefined;
    cns?: string | undefined;
    emergencyContactName?: string | undefined;
    religiousAffiliation?: string | undefined;
    ageBand?: string | undefined;
    rg?: string | undefined;
    municipalityCode?: string | undefined;
    healthUnitCNES?: string | undefined;
    susPacientId?: string | undefined;
    advanceDirectivesNotes?: string | undefined;
    dnrDate?: string | Date | undefined;
    dniDate?: string | Date | undefined;
    codeStatus?: "FULL_CODE" | "DNR" | "DNI" | "DNR_DNI" | "COMFORT_CARE_ONLY" | "AND" | undefined;
    primaryCaregiverId?: string | undefined;
    qualityOfLifeScore?: number | undefined;
    lastQoLAssessment?: string | Date | undefined;
    spiritualCareNeeds?: string | undefined;
    primaryContactName?: string | undefined;
    primaryContactRelation?: string | undefined;
    primaryContactPhone?: string | null | undefined;
    primaryContactEmail?: string | null | undefined;
    primaryContactAddress?: string | undefined;
    secondaryContactRelation?: string | undefined;
    secondaryContactPhone?: string | null | undefined;
    secondaryContactEmail?: string | null | undefined;
    emergencyContactPhone?: string | null | undefined;
    emergencyContactRelation?: string | undefined;
    photoUrl?: string | undefined;
    photoConsentDate?: string | Date | undefined;
    photoConsentBy?: string | undefined;
    preferredName?: string | undefined;
    pronouns?: string | undefined;
    culturalPreferences?: string | undefined;
    communicationNeeds?: string | undefined;
    mobilityNeeds?: string | undefined;
    dietaryNeeds?: string | undefined;
    careTeamNotes?: string | undefined;
    flaggedConcerns?: string[] | undefined;
    createdBy?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    mrn: string;
    email?: string | null | undefined;
    state?: string | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    gender?: "O" | "F" | "M" | "U" | undefined;
    region?: string | undefined;
    postalCode?: string | undefined;
    secondaryContactName?: string | undefined;
    advanceDirectivesStatus?: "COMPLETED" | "IN_PROGRESS" | "NOT_COMPLETED" | "REVIEWED_ANNUALLY" | undefined;
    specialNeedsType?: string[] | undefined;
    sensoryNeeds?: string | undefined;
    advanceDirectivesDate?: string | Date | undefined;
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    externalMrn?: string | undefined;
    cpf?: string | undefined;
    cns?: string | undefined;
    isPalliativeCare?: boolean | undefined;
    emergencyContactName?: string | undefined;
    religiousAffiliation?: string | undefined;
    ageBand?: string | undefined;
    rg?: string | undefined;
    municipalityCode?: string | undefined;
    healthUnitCNES?: string | undefined;
    susPacientId?: string | undefined;
    comfortCareOnly?: boolean | undefined;
    advanceDirectivesNotes?: string | undefined;
    dnrStatus?: boolean | undefined;
    dnrDate?: string | Date | undefined;
    dniStatus?: boolean | undefined;
    dniDate?: string | Date | undefined;
    codeStatus?: "FULL_CODE" | "DNR" | "DNI" | "DNR_DNI" | "COMFORT_CARE_ONLY" | "AND" | undefined;
    primaryCaregiverId?: string | undefined;
    qualityOfLifeScore?: number | undefined;
    lastQoLAssessment?: string | Date | undefined;
    spiritualCareNeeds?: string | undefined;
    chaplainAssigned?: boolean | undefined;
    primaryContactName?: string | undefined;
    primaryContactRelation?: string | undefined;
    primaryContactPhone?: string | null | undefined;
    primaryContactEmail?: string | null | undefined;
    primaryContactAddress?: string | undefined;
    secondaryContactRelation?: string | undefined;
    secondaryContactPhone?: string | null | undefined;
    secondaryContactEmail?: string | null | undefined;
    emergencyContactPhone?: string | null | undefined;
    emergencyContactRelation?: string | undefined;
    familyPortalEnabled?: boolean | undefined;
    photoUrl?: string | undefined;
    photoConsentDate?: string | Date | undefined;
    photoConsentBy?: string | undefined;
    preferredName?: string | undefined;
    pronouns?: string | undefined;
    culturalPreferences?: string | undefined;
    hasSpecialNeeds?: boolean | undefined;
    communicationNeeds?: string | undefined;
    mobilityNeeds?: string | undefined;
    dietaryNeeds?: string | undefined;
    careTeamNotes?: string | undefined;
    flaggedConcerns?: string[] | undefined;
    createdBy?: string | undefined;
}>;
export declare const UpdatePatientSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, string | Date, string | Date>>;
    mrn: z.ZodOptional<z.ZodString>;
    externalMrn: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    gender: z.ZodOptional<z.ZodOptional<z.ZodEnum<["M", "F", "O", "U"]>>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    city: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    state: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    postalCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    country: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    ageBand: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    region: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    cns: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    cpf: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    rg: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    municipalityCode: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    healthUnitCNES: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    susPacientId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isPalliativeCare: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    comfortCareOnly: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    advanceDirectivesStatus: z.ZodOptional<z.ZodOptional<z.ZodEnum<["NOT_COMPLETED", "IN_PROGRESS", "COMPLETED", "REVIEWED_ANNUALLY"]>>>;
    advanceDirectivesDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    advanceDirectivesNotes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dnrStatus: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    dnrDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    dniStatus: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    dniDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    codeStatus: z.ZodOptional<z.ZodOptional<z.ZodEnum<["FULL_CODE", "DNR", "DNI", "DNR_DNI", "COMFORT_CARE_ONLY", "AND"]>>>;
    primaryCaregiverId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    qualityOfLifeScore: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    lastQoLAssessment: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    religiousAffiliation: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    spiritualCareNeeds: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    chaplainAssigned: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    primaryContactName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    primaryContactRelation: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    primaryContactPhone: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    primaryContactEmail: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    primaryContactAddress: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    secondaryContactName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    secondaryContactRelation: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    secondaryContactPhone: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    secondaryContactEmail: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    emergencyContactName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    emergencyContactPhone: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    emergencyContactRelation: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    familyPortalEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    photoUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    photoConsentDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    photoConsentBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    preferredName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    pronouns: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    culturalPreferences: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    hasSpecialNeeds: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    specialNeedsType: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    communicationNeeds: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    mobilityNeeds: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dietaryNeeds: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sensoryNeeds: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    careTeamNotes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    flaggedConcerns: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    assignedClinicianId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    createdBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email?: string | null | undefined;
    state?: string | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    gender?: "O" | "F" | "M" | "U" | undefined;
    region?: string | undefined;
    postalCode?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | Date | undefined;
    mrn?: string | undefined;
    secondaryContactName?: string | undefined;
    advanceDirectivesStatus?: "COMPLETED" | "IN_PROGRESS" | "NOT_COMPLETED" | "REVIEWED_ANNUALLY" | undefined;
    specialNeedsType?: string[] | undefined;
    sensoryNeeds?: string | undefined;
    advanceDirectivesDate?: string | Date | undefined;
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    externalMrn?: string | undefined;
    cpf?: string | undefined;
    cns?: string | undefined;
    isPalliativeCare?: boolean | undefined;
    emergencyContactName?: string | undefined;
    religiousAffiliation?: string | undefined;
    ageBand?: string | undefined;
    rg?: string | undefined;
    municipalityCode?: string | undefined;
    healthUnitCNES?: string | undefined;
    susPacientId?: string | undefined;
    comfortCareOnly?: boolean | undefined;
    advanceDirectivesNotes?: string | undefined;
    dnrStatus?: boolean | undefined;
    dnrDate?: string | Date | undefined;
    dniStatus?: boolean | undefined;
    dniDate?: string | Date | undefined;
    codeStatus?: "FULL_CODE" | "DNR" | "DNI" | "DNR_DNI" | "COMFORT_CARE_ONLY" | "AND" | undefined;
    primaryCaregiverId?: string | undefined;
    qualityOfLifeScore?: number | undefined;
    lastQoLAssessment?: string | Date | undefined;
    spiritualCareNeeds?: string | undefined;
    chaplainAssigned?: boolean | undefined;
    primaryContactName?: string | undefined;
    primaryContactRelation?: string | undefined;
    primaryContactPhone?: string | null | undefined;
    primaryContactEmail?: string | null | undefined;
    primaryContactAddress?: string | undefined;
    secondaryContactRelation?: string | undefined;
    secondaryContactPhone?: string | null | undefined;
    secondaryContactEmail?: string | null | undefined;
    emergencyContactPhone?: string | null | undefined;
    emergencyContactRelation?: string | undefined;
    familyPortalEnabled?: boolean | undefined;
    photoUrl?: string | undefined;
    photoConsentDate?: string | Date | undefined;
    photoConsentBy?: string | undefined;
    preferredName?: string | undefined;
    pronouns?: string | undefined;
    culturalPreferences?: string | undefined;
    hasSpecialNeeds?: boolean | undefined;
    communicationNeeds?: string | undefined;
    mobilityNeeds?: string | undefined;
    dietaryNeeds?: string | undefined;
    careTeamNotes?: string | undefined;
    flaggedConcerns?: string[] | undefined;
    createdBy?: string | undefined;
}, {
    email?: string | null | undefined;
    state?: string | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    gender?: "O" | "F" | "M" | "U" | undefined;
    region?: string | undefined;
    postalCode?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    dateOfBirth?: string | Date | undefined;
    mrn?: string | undefined;
    secondaryContactName?: string | undefined;
    advanceDirectivesStatus?: "COMPLETED" | "IN_PROGRESS" | "NOT_COMPLETED" | "REVIEWED_ANNUALLY" | undefined;
    specialNeedsType?: string[] | undefined;
    sensoryNeeds?: string | undefined;
    advanceDirectivesDate?: string | Date | undefined;
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    externalMrn?: string | undefined;
    cpf?: string | undefined;
    cns?: string | undefined;
    isPalliativeCare?: boolean | undefined;
    emergencyContactName?: string | undefined;
    religiousAffiliation?: string | undefined;
    ageBand?: string | undefined;
    rg?: string | undefined;
    municipalityCode?: string | undefined;
    healthUnitCNES?: string | undefined;
    susPacientId?: string | undefined;
    comfortCareOnly?: boolean | undefined;
    advanceDirectivesNotes?: string | undefined;
    dnrStatus?: boolean | undefined;
    dnrDate?: string | Date | undefined;
    dniStatus?: boolean | undefined;
    dniDate?: string | Date | undefined;
    codeStatus?: "FULL_CODE" | "DNR" | "DNI" | "DNR_DNI" | "COMFORT_CARE_ONLY" | "AND" | undefined;
    primaryCaregiverId?: string | undefined;
    qualityOfLifeScore?: number | undefined;
    lastQoLAssessment?: string | Date | undefined;
    spiritualCareNeeds?: string | undefined;
    chaplainAssigned?: boolean | undefined;
    primaryContactName?: string | undefined;
    primaryContactRelation?: string | undefined;
    primaryContactPhone?: string | null | undefined;
    primaryContactEmail?: string | null | undefined;
    primaryContactAddress?: string | undefined;
    secondaryContactRelation?: string | undefined;
    secondaryContactPhone?: string | null | undefined;
    secondaryContactEmail?: string | null | undefined;
    emergencyContactPhone?: string | null | undefined;
    emergencyContactRelation?: string | undefined;
    familyPortalEnabled?: boolean | undefined;
    photoUrl?: string | undefined;
    photoConsentDate?: string | Date | undefined;
    photoConsentBy?: string | undefined;
    preferredName?: string | undefined;
    pronouns?: string | undefined;
    culturalPreferences?: string | undefined;
    hasSpecialNeeds?: boolean | undefined;
    communicationNeeds?: string | undefined;
    mobilityNeeds?: string | undefined;
    dietaryNeeds?: string | undefined;
    careTeamNotes?: string | undefined;
    flaggedConcerns?: string[] | undefined;
    createdBy?: string | undefined;
}>;
export declare const PatientQuerySchema: z.ZodObject<{
    page: z.ZodPipeline<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>, z.ZodNumber>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>, z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    assignedClinicianId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    isActive: boolean;
    search?: string | undefined;
    assignedClinicianId?: string | undefined;
}, {
    search?: string | undefined;
    limit?: string | undefined;
    assignedClinicianId?: string | undefined;
    page?: string | undefined;
    isActive?: string | undefined;
}>;
export declare const DiagnosisSchema: z.ZodObject<{
    icd10Code: z.ZodString;
    description: z.ZodString;
    isPrimary: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description: string;
    icd10Code: string;
    isPrimary: boolean;
}, {
    description: string;
    icd10Code: string;
    isPrimary?: boolean | undefined;
}>;
export declare const ProcedureSchema: z.ZodObject<{
    cptCode: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    cptCode: string;
}, {
    description: string;
    cptCode: string;
}>;
export declare const MedicationSchema: z.ZodObject<{
    action: z.ZodEnum<["prescribe", "discontinue", "modify"]>;
    name: z.ZodString;
    dose: z.ZodString;
    frequency: z.ZodString;
    duration: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    action: "prescribe" | "discontinue" | "modify";
    frequency: string;
    dose: string;
    duration?: string | undefined;
    instructions?: string | undefined;
}, {
    name: string;
    action: "prescribe" | "discontinue" | "modify";
    frequency: string;
    dose: string;
    duration?: string | undefined;
    instructions?: string | undefined;
}>;
export declare const CreateSOAPNoteSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
    patientId: z.ZodString;
    clinicianId: z.ZodString;
    chiefComplaint: z.ZodString;
    subjective: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    objective: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    assessment: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    plan: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    subjectiveConfidence: z.ZodOptional<z.ZodNumber>;
    objectiveConfidence: z.ZodOptional<z.ZodNumber>;
    assessmentConfidence: z.ZodOptional<z.ZodNumber>;
    planConfidence: z.ZodOptional<z.ZodNumber>;
    overallConfidence: z.ZodOptional<z.ZodNumber>;
    vitalSigns: z.ZodOptional<z.ZodObject<{
        bp: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        hr: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
        temp: z.ZodOptional<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodNumber, number, number>, z.ZodNumber>, z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>]>>;
        rr: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
        spo2: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
        weight: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
    }, "strip", z.ZodTypeAny, {
        hr?: number | undefined;
        temp?: number | undefined;
        rr?: number | undefined;
        bp?: string | undefined;
        weight?: number | undefined;
        spo2?: number | undefined;
    }, {
        hr?: string | number | undefined;
        temp?: string | number | undefined;
        rr?: string | number | undefined;
        bp?: string | undefined;
        weight?: string | number | undefined;
        spo2?: string | number | undefined;
    }>>;
    diagnoses: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        description: z.ZodString;
        isPrimary: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        icd10Code: string;
        isPrimary: boolean;
    }, {
        description: string;
        icd10Code: string;
        isPrimary?: boolean | undefined;
    }>, "many">>>;
    procedures: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        cptCode: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        cptCode: string;
    }, {
        description: string;
        cptCode: string;
    }>, "many">>>;
    medications: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        action: z.ZodEnum<["prescribe", "discontinue", "modify"]>;
        name: z.ZodString;
        dose: z.ZodString;
        frequency: z.ZodString;
        duration: z.ZodOptional<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }, {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }>, "many">>>;
    model: z.ZodOptional<z.ZodString>;
    tokensUsed: z.ZodOptional<z.ZodNumber>;
    processingTime: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    clinicianId: string;
    medications: {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }[];
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint: string;
    diagnoses: {
        description: string;
        icd10Code: string;
        isPrimary: boolean;
    }[];
    procedures: {
        description: string;
        cptCode: string;
    }[];
    model?: string | undefined;
    vitalSigns?: {
        hr?: number | undefined;
        temp?: number | undefined;
        rr?: number | undefined;
        bp?: string | undefined;
        weight?: number | undefined;
        spo2?: number | undefined;
    } | undefined;
    sessionId?: string | undefined;
    subjectiveConfidence?: number | undefined;
    objectiveConfidence?: number | undefined;
    assessmentConfidence?: number | undefined;
    planConfidence?: number | undefined;
    overallConfidence?: number | undefined;
    tokensUsed?: number | undefined;
    processingTime?: number | undefined;
}, {
    patientId: string;
    clinicianId: string;
    chiefComplaint: string;
    model?: string | undefined;
    medications?: {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }[] | undefined;
    subjective?: string | undefined;
    objective?: string | undefined;
    assessment?: string | undefined;
    plan?: string | undefined;
    diagnoses?: {
        description: string;
        icd10Code: string;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    procedures?: {
        description: string;
        cptCode: string;
    }[] | undefined;
    vitalSigns?: {
        hr?: string | number | undefined;
        temp?: string | number | undefined;
        rr?: string | number | undefined;
        bp?: string | undefined;
        weight?: string | number | undefined;
        spo2?: string | number | undefined;
    } | undefined;
    sessionId?: string | undefined;
    subjectiveConfidence?: number | undefined;
    objectiveConfidence?: number | undefined;
    assessmentConfidence?: number | undefined;
    planConfidence?: number | undefined;
    overallConfidence?: number | undefined;
    tokensUsed?: number | undefined;
    processingTime?: number | undefined;
}>;
export declare const UpdateSOAPNoteSchema: z.ZodObject<Omit<{
    sessionId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodOptional<z.ZodString>;
    clinicianId: z.ZodOptional<z.ZodString>;
    chiefComplaint: z.ZodOptional<z.ZodString>;
    subjective: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    objective: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    assessment: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    plan: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    subjectiveConfidence: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    objectiveConfidence: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    assessmentConfidence: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    planConfidence: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    overallConfidence: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    vitalSigns: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        bp: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        hr: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
        temp: z.ZodOptional<z.ZodUnion<[z.ZodPipeline<z.ZodEffects<z.ZodNumber, number, number>, z.ZodNumber>, z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>]>>;
        rr: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
        spo2: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
        weight: z.ZodUnion<[z.ZodOptional<z.ZodNumber>, z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>]>;
    }, "strip", z.ZodTypeAny, {
        hr?: number | undefined;
        temp?: number | undefined;
        rr?: number | undefined;
        bp?: string | undefined;
        weight?: number | undefined;
        spo2?: number | undefined;
    }, {
        hr?: string | number | undefined;
        temp?: string | number | undefined;
        rr?: string | number | undefined;
        bp?: string | undefined;
        weight?: string | number | undefined;
        spo2?: string | number | undefined;
    }>>>;
    diagnoses: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        description: z.ZodString;
        isPrimary: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        icd10Code: string;
        isPrimary: boolean;
    }, {
        description: string;
        icd10Code: string;
        isPrimary?: boolean | undefined;
    }>, "many">>>>;
    procedures: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        cptCode: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        cptCode: string;
    }, {
        description: string;
        cptCode: string;
    }>, "many">>>>;
    medications: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        action: z.ZodEnum<["prescribe", "discontinue", "modify"]>;
        name: z.ZodString;
        dose: z.ZodString;
        frequency: z.ZodString;
        duration: z.ZodOptional<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }, {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }>, "many">>>>;
    model: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    tokensUsed: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    processingTime: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, "patientId" | "clinicianId" | "sessionId">, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    medications?: {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }[] | undefined;
    subjective?: string | undefined;
    objective?: string | undefined;
    assessment?: string | undefined;
    plan?: string | undefined;
    chiefComplaint?: string | undefined;
    diagnoses?: {
        description: string;
        icd10Code: string;
        isPrimary: boolean;
    }[] | undefined;
    procedures?: {
        description: string;
        cptCode: string;
    }[] | undefined;
    vitalSigns?: {
        hr?: number | undefined;
        temp?: number | undefined;
        rr?: number | undefined;
        bp?: string | undefined;
        weight?: number | undefined;
        spo2?: number | undefined;
    } | undefined;
    subjectiveConfidence?: number | undefined;
    objectiveConfidence?: number | undefined;
    assessmentConfidence?: number | undefined;
    planConfidence?: number | undefined;
    overallConfidence?: number | undefined;
    tokensUsed?: number | undefined;
    processingTime?: number | undefined;
}, {
    model?: string | undefined;
    medications?: {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }[] | undefined;
    subjective?: string | undefined;
    objective?: string | undefined;
    assessment?: string | undefined;
    plan?: string | undefined;
    chiefComplaint?: string | undefined;
    diagnoses?: {
        description: string;
        icd10Code: string;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    procedures?: {
        description: string;
        cptCode: string;
    }[] | undefined;
    vitalSigns?: {
        hr?: string | number | undefined;
        temp?: string | number | undefined;
        rr?: string | number | undefined;
        bp?: string | undefined;
        weight?: string | number | undefined;
        spo2?: string | number | undefined;
    } | undefined;
    subjectiveConfidence?: number | undefined;
    objectiveConfidence?: number | undefined;
    assessmentConfidence?: number | undefined;
    planConfidence?: number | undefined;
    overallConfidence?: number | undefined;
    tokensUsed?: number | undefined;
    processingTime?: number | undefined;
}>;
export declare const AudioUploadSchema: z.ZodObject<{
    duration: z.ZodUnion<[z.ZodNumber, z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>]>;
}, "strip", z.ZodTypeAny, {
    duration: number;
}, {
    duration: string | number;
}>;
export declare const CreateScribeSessionSchema: z.ZodObject<{
    patientId: z.ZodString;
    clinicianId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    clinicianId?: string | undefined;
}, {
    patientId: string;
    clinicianId?: string | undefined;
}>;
export declare const CreatePrescriptionSchema: z.ZodObject<{
    patientId: z.ZodString;
    medications: z.ZodArray<z.ZodObject<{
        action: z.ZodEnum<["prescribe", "discontinue", "modify"]>;
        name: z.ZodString;
        dose: z.ZodString;
        frequency: z.ZodString;
        duration: z.ZodOptional<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }, {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }>, "many">;
    diagnosis: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    medications: {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }[];
    diagnosis?: string | undefined;
    instructions?: string | undefined;
}, {
    patientId: string;
    medications: {
        name: string;
        action: "prescribe" | "discontinue" | "modify";
        frequency: string;
        dose: string;
        duration?: string | undefined;
        instructions?: string | undefined;
    }[];
    diagnosis?: string | undefined;
    instructions?: string | undefined;
}>;
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
export type CreateSOAPNoteInput = z.infer<typeof CreateSOAPNoteSchema>;
export type UpdateSOAPNoteInput = z.infer<typeof UpdateSOAPNoteSchema>;
export type VitalSignsInput = z.infer<typeof VitalSignsSchema>;
export type DiagnosisInput = z.infer<typeof DiagnosisSchema>;
export type ProcedureInput = z.infer<typeof ProcedureSchema>;
export type MedicationInput = z.infer<typeof MedicationSchema>;
//# sourceMappingURL=schemas.d.ts.map