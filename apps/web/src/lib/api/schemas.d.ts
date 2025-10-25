/**
 * API Request/Response Validation Schemas
 * Using Zod for type-safe validation
 */
import { z } from 'zod';
export declare const CreatePatientSchema: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    dateOfBirth: z.ZodUnion<[z.ZodString, z.ZodDate]>;
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
    assignedClinicianId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    country: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    email?: string | null | undefined;
    state?: string | undefined;
    address?: string | null | undefined;
    gender?: "O" | "F" | "M" | "U" | undefined;
    region?: string | undefined;
    postalCode?: string | undefined;
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    ageBand?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    email?: string | null | undefined;
    state?: string | undefined;
    address?: string | null | undefined;
    country?: string | undefined;
    gender?: "O" | "F" | "M" | "U" | undefined;
    region?: string | undefined;
    postalCode?: string | undefined;
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    ageBand?: string | undefined;
}>;
export declare const UpdatePatientSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
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
    assignedClinicianId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
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
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    ageBand?: string | undefined;
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
    assignedClinicianId?: string | undefined;
    phone?: string | null | undefined;
    city?: string | undefined;
    ageBand?: string | undefined;
}>;
export declare const PatientQuerySchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
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
export declare const MedicationItemSchema: z.ZodObject<{
    name: z.ZodString;
    dose: z.ZodString;
    frequency: z.ZodString;
    instructions: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    frequency: string;
    dose: string;
    instructions?: string | undefined;
}, {
    name: string;
    frequency: string;
    dose: string;
    instructions?: string | undefined;
}>;
export declare const CreatePrescriptionSchema: z.ZodObject<{
    patientId: z.ZodString;
    clinicianId: z.ZodString;
    medications: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        dose: z.ZodString;
        frequency: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        frequency: string;
        dose: string;
        instructions?: string | undefined;
    }, {
        name: string;
        frequency: string;
        dose: string;
        instructions?: string | undefined;
    }>, "many">;
    instructions: z.ZodOptional<z.ZodString>;
    diagnosis: z.ZodOptional<z.ZodString>;
    signatureMethod: z.ZodEnum<["pin", "signature"]>;
    signatureData: z.ZodString;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    clinicianId: string;
    medications: {
        name: string;
        frequency: string;
        dose: string;
        instructions?: string | undefined;
    }[];
    signatureMethod: "pin" | "signature";
    signatureData: string;
    diagnosis?: string | undefined;
    instructions?: string | undefined;
}, {
    patientId: string;
    clinicianId: string;
    medications: {
        name: string;
        frequency: string;
        dose: string;
        instructions?: string | undefined;
    }[];
    signatureMethod: "pin" | "signature";
    signatureData: string;
    diagnosis?: string | undefined;
    instructions?: string | undefined;
}>;
export declare const PrescriptionQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    clinicianId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "SIGNED", "SENT", "DISPENSED", "CANCELLED"]>>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "SENT" | "SIGNED" | "PENDING" | "CANCELLED" | "DISPENSED" | undefined;
    patientId?: string | undefined;
    clinicianId?: string | undefined;
}, {
    status?: "SENT" | "SIGNED" | "PENDING" | "CANCELLED" | "DISPENSED" | undefined;
    limit?: string | undefined;
    patientId?: string | undefined;
    clinicianId?: string | undefined;
}>;
export declare const CreateClinicalNoteSchema: z.ZodObject<{
    patientId: z.ZodString;
    clinicianId: z.ZodString;
    noteType: z.ZodEnum<["FOLLOW_UP", "INITIAL_CONSULT", "PROCEDURE", "EMERGENCY"]>;
    chiefComplaint: z.ZodString;
    subjective: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    objective: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    assessment: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    plan: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    vitalSigns: z.ZodOptional<z.ZodObject<{
        bloodPressure: z.ZodOptional<z.ZodString>;
        heartRate: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodString>;
        respiratoryRate: z.ZodOptional<z.ZodString>;
        oxygenSaturation: z.ZodOptional<z.ZodString>;
        weight: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        temperature?: string | undefined;
        bloodPressure?: string | undefined;
        heartRate?: string | undefined;
        respiratoryRate?: string | undefined;
        oxygenSaturation?: string | undefined;
        weight?: string | undefined;
    }, {
        temperature?: string | undefined;
        bloodPressure?: string | undefined;
        heartRate?: string | undefined;
        respiratoryRate?: string | undefined;
        oxygenSaturation?: string | undefined;
        weight?: string | undefined;
    }>>;
    diagnoses: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    procedures: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    clinicianId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint: string;
    diagnoses: string[];
    procedures: string[];
    noteType: "EMERGENCY" | "PROCEDURE" | "FOLLOW_UP" | "INITIAL_CONSULT";
    vitalSigns?: {
        temperature?: string | undefined;
        bloodPressure?: string | undefined;
        heartRate?: string | undefined;
        respiratoryRate?: string | undefined;
        oxygenSaturation?: string | undefined;
        weight?: string | undefined;
    } | undefined;
}, {
    patientId: string;
    clinicianId: string;
    chiefComplaint: string;
    noteType: "EMERGENCY" | "PROCEDURE" | "FOLLOW_UP" | "INITIAL_CONSULT";
    subjective?: string | undefined;
    objective?: string | undefined;
    assessment?: string | undefined;
    plan?: string | undefined;
    diagnoses?: string[] | undefined;
    procedures?: string[] | undefined;
    vitalSigns?: {
        temperature?: string | undefined;
        bloodPressure?: string | undefined;
        heartRate?: string | undefined;
        respiratoryRate?: string | undefined;
        oxygenSaturation?: string | undefined;
        weight?: string | undefined;
    } | undefined;
}>;
export declare const ClinicalNoteQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    clinicianId: z.ZodOptional<z.ZodString>;
    noteType: z.ZodOptional<z.ZodEnum<["FOLLOW_UP", "INITIAL_CONSULT", "PROCEDURE", "EMERGENCY"]>>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    patientId?: string | undefined;
    clinicianId?: string | undefined;
    noteType?: "EMERGENCY" | "PROCEDURE" | "FOLLOW_UP" | "INITIAL_CONSULT" | undefined;
}, {
    limit?: string | undefined;
    patientId?: string | undefined;
    clinicianId?: string | undefined;
    noteType?: "EMERGENCY" | "PROCEDURE" | "FOLLOW_UP" | "INITIAL_CONSULT" | undefined;
}>;
export declare const CreateAppointmentSchema: z.ZodObject<{
    patientId: z.ZodString;
    clinicianId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startTime: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    endTime: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    timezone: z.ZodDefault<z.ZodString>;
    type: z.ZodDefault<z.ZodEnum<["IN_PERSON", "TELEMEDICINE", "PHONE", "HOME_VISIT"]>>;
    meetingUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "IN_PERSON" | "PHONE" | "TELEMEDICINE" | "HOME_VISIT";
    title: string;
    patientId: string;
    clinicianId: string;
    timezone: string;
    startTime: string | Date;
    endTime: string | Date;
    description?: string | undefined;
    meetingUrl?: string | undefined;
}, {
    title: string;
    patientId: string;
    clinicianId: string;
    startTime: string | Date;
    endTime: string | Date;
    type?: "IN_PERSON" | "PHONE" | "TELEMEDICINE" | "HOME_VISIT" | undefined;
    description?: string | undefined;
    timezone?: string | undefined;
    meetingUrl?: string | undefined;
}>;
export declare const UpdateAppointmentSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    endTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    status: z.ZodOptional<z.ZodEnum<["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]>>;
    meetingUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "SCHEDULED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    startTime?: string | Date | undefined;
    endTime?: string | Date | undefined;
    meetingUrl?: string | undefined;
}, {
    status?: "SCHEDULED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    startTime?: string | Date | undefined;
    endTime?: string | Date | undefined;
    meetingUrl?: string | undefined;
}>;
export declare const AppointmentQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    clinicianId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "SCHEDULED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | undefined;
    patientId?: string | undefined;
    clinicianId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    status?: "SCHEDULED" | "COMPLETED" | "CONFIRMED" | "CANCELLED" | "NO_SHOW" | undefined;
    limit?: string | undefined;
    patientId?: string | undefined;
    clinicianId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const CreateConsentSchema: z.ZodObject<{
    patientId: z.ZodString;
    type: z.ZodEnum<["TREATMENT", "DATA_SHARING", "RESEARCH", "TELEMEDICINE", "PHOTOGRAPHY"]>;
    title: z.ZodString;
    content: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    signatureData: z.ZodString;
    witnessName: z.ZodOptional<z.ZodString>;
    witnessSignature: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "TELEMEDICINE" | "TREATMENT" | "DATA_SHARING" | "RESEARCH" | "PHOTOGRAPHY";
    version: string;
    content: string;
    title: string;
    patientId: string;
    signatureData: string;
    witnessName?: string | undefined;
    witnessSignature?: string | undefined;
}, {
    type: "TELEMEDICINE" | "TREATMENT" | "DATA_SHARING" | "RESEARCH" | "PHOTOGRAPHY";
    content: string;
    title: string;
    patientId: string;
    signatureData: string;
    version?: string | undefined;
    witnessName?: string | undefined;
    witnessSignature?: string | undefined;
}>;
export declare const ConsentQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["TREATMENT", "DATA_SHARING", "RESEARCH", "TELEMEDICINE", "PHOTOGRAPHY"]>>;
    isActive: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    isActive: boolean;
    type?: "TELEMEDICINE" | "TREATMENT" | "DATA_SHARING" | "RESEARCH" | "PHOTOGRAPHY" | undefined;
    patientId?: string | undefined;
}, {
    type?: "TELEMEDICINE" | "TREATMENT" | "DATA_SHARING" | "RESEARCH" | "PHOTOGRAPHY" | undefined;
    limit?: string | undefined;
    patientId?: string | undefined;
    isActive?: string | undefined;
}>;
export declare const DocumentUploadSchema: z.ZodObject<{
    patientId: z.ZodString;
    fileName: z.ZodString;
    fileType: z.ZodString;
    fileSize: z.ZodNumber;
    documentType: z.ZodEnum<["LAB_RESULTS", "IMAGING", "CONSULTATION_NOTES", "DISCHARGE_SUMMARY", "PRESCRIPTION", "INSURANCE", "CONSENT_FORM", "OTHER"]>;
    storageUrl: z.ZodString;
    uploadedBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    documentType: "OTHER" | "IMAGING" | "PRESCRIPTION" | "INSURANCE" | "LAB_RESULTS" | "CONSULTATION_NOTES" | "DISCHARGE_SUMMARY" | "CONSENT_FORM";
    fileSize: number;
    fileName: string;
    fileType: string;
    storageUrl: string;
    uploadedBy: string;
}, {
    patientId: string;
    documentType: "OTHER" | "IMAGING" | "PRESCRIPTION" | "INSURANCE" | "LAB_RESULTS" | "CONSULTATION_NOTES" | "DISCHARGE_SUMMARY" | "CONSENT_FORM";
    fileSize: number;
    fileName: string;
    fileType: string;
    storageUrl: string;
    uploadedBy: string;
}>;
export declare const DocumentQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    documentType: z.ZodOptional<z.ZodEnum<["LAB_RESULTS", "IMAGING", "CONSULTATION_NOTES", "DISCHARGE_SUMMARY", "PRESCRIPTION", "INSURANCE", "CONSENT_FORM", "OTHER"]>>;
    isDeidentified: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    isDeidentified: boolean;
    patientId?: string | undefined;
    documentType?: "OTHER" | "IMAGING" | "PRESCRIPTION" | "INSURANCE" | "LAB_RESULTS" | "CONSULTATION_NOTES" | "DISCHARGE_SUMMARY" | "CONSENT_FORM" | undefined;
}, {
    limit?: string | undefined;
    patientId?: string | undefined;
    documentType?: "OTHER" | "IMAGING" | "PRESCRIPTION" | "INSURANCE" | "LAB_RESULTS" | "CONSULTATION_NOTES" | "DISCHARGE_SUMMARY" | "CONSENT_FORM" | undefined;
    isDeidentified?: string | undefined;
}>;
export declare const CreateUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["ADMIN", "CLINICIAN", "NURSE", "STAFF"]>>;
    specialty: z.ZodOptional<z.ZodString>;
    licenseNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    role: "CLINICIAN" | "ADMIN" | "NURSE" | "STAFF";
    firstName: string;
    lastName: string;
    licenseNumber?: string | undefined;
    specialty?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "CLINICIAN" | "ADMIN" | "NURSE" | "STAFF" | undefined;
    licenseNumber?: string | undefined;
    specialty?: string | undefined;
}>;
export declare const UpdateUserSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    specialty: z.ZodOptional<z.ZodString>;
    licenseNumber: z.ZodOptional<z.ZodString>;
    mfaEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    licenseNumber?: string | undefined;
    specialty?: string | undefined;
    mfaEnabled?: boolean | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    licenseNumber?: string | undefined;
    specialty?: string | undefined;
    mfaEnabled?: boolean | undefined;
}>;
export declare const UserQuerySchema: z.ZodObject<{
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "CLINICIAN", "NURSE", "STAFF"]>>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    role?: "CLINICIAN" | "ADMIN" | "NURSE" | "STAFF" | undefined;
    search?: string | undefined;
}, {
    role?: "CLINICIAN" | "ADMIN" | "NURSE" | "STAFF" | undefined;
    search?: string | undefined;
    limit?: string | undefined;
}>;
export declare const CreateMedicationSchema: z.ZodObject<{
    patientId: z.ZodString;
    name: z.ZodString;
    genericName: z.ZodOptional<z.ZodString>;
    dose: z.ZodString;
    frequency: z.ZodString;
    route: z.ZodOptional<z.ZodString>;
    instructions: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    endDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    prescribedBy: z.ZodOptional<z.ZodString>;
    prescriptionHash: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    patientId: string;
    frequency: string;
    dose: string;
    route?: string | undefined;
    prescribedBy?: string | undefined;
    startDate?: string | Date | undefined;
    endDate?: string | Date | undefined;
    instructions?: string | undefined;
    genericName?: string | undefined;
    prescriptionHash?: string | undefined;
}, {
    name: string;
    patientId: string;
    frequency: string;
    dose: string;
    route?: string | undefined;
    prescribedBy?: string | undefined;
    startDate?: string | Date | undefined;
    endDate?: string | Date | undefined;
    instructions?: string | undefined;
    genericName?: string | undefined;
    prescriptionHash?: string | undefined;
}>;
export declare const UpdateMedicationSchema: z.ZodObject<Omit<{
    patientId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    genericName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dose: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    instructions: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    startDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    endDate: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    prescribedBy: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    prescriptionHash: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "patientId">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    route?: string | undefined;
    prescribedBy?: string | undefined;
    startDate?: string | Date | undefined;
    endDate?: string | Date | undefined;
    instructions?: string | undefined;
    genericName?: string | undefined;
    frequency?: string | undefined;
    dose?: string | undefined;
    prescriptionHash?: string | undefined;
}, {
    name?: string | undefined;
    route?: string | undefined;
    prescribedBy?: string | undefined;
    startDate?: string | Date | undefined;
    endDate?: string | Date | undefined;
    instructions?: string | undefined;
    genericName?: string | undefined;
    frequency?: string | undefined;
    dose?: string | undefined;
    prescriptionHash?: string | undefined;
}>;
export declare const MedicationQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    isActive: boolean;
    patientId?: string | undefined;
}, {
    limit?: string | undefined;
    patientId?: string | undefined;
    isActive?: string | undefined;
}>;
export declare const CreateAuditLogSchema: z.ZodObject<{
    userEmail: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    action: z.ZodEnum<["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "SHARE", "CONSENT_GIVEN", "CONSENT_REVOKED"]>;
    resource: z.ZodString;
    resourceId: z.ZodDefault<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    success: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    resource: string;
    resourceId: string;
    action: "DELETE" | "CREATE" | "UPDATE" | "READ" | "LOGIN" | "LOGOUT" | "EXPORT" | "SHARE" | "CONSENT_GIVEN" | "CONSENT_REVOKED";
    userEmail: string;
    details?: Record<string, any> | undefined;
}, {
    resource: string;
    action: "DELETE" | "CREATE" | "UPDATE" | "READ" | "LOGIN" | "LOGOUT" | "EXPORT" | "SHARE" | "CONSENT_GIVEN" | "CONSENT_REVOKED";
    details?: Record<string, any> | undefined;
    success?: boolean | undefined;
    resourceId?: string | undefined;
    userEmail?: string | undefined;
}>;
export declare const AuditLogQuerySchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    userEmail: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodEnum<["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "SHARE", "CONSENT_GIVEN", "CONSENT_REVOKED"]>>;
    resource: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    userId?: string | undefined;
    resource?: string | undefined;
    action?: "DELETE" | "CREATE" | "UPDATE" | "READ" | "LOGIN" | "LOGOUT" | "EXPORT" | "SHARE" | "CONSENT_GIVEN" | "CONSENT_REVOKED" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    userEmail?: string | undefined;
}, {
    userId?: string | undefined;
    limit?: string | undefined;
    resource?: string | undefined;
    action?: "DELETE" | "CREATE" | "UPDATE" | "READ" | "LOGIN" | "LOGOUT" | "EXPORT" | "SHARE" | "CONSENT_GIVEN" | "CONSENT_REVOKED" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    userEmail?: string | undefined;
}>;
export declare const AnalyticsQuerySchema: z.ZodObject<{
    metric: z.ZodEnum<["patient_count", "appointments_today", "prescriptions_today", "clinical_notes_count", "active_medications", "consent_compliance"]>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    clinicianId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    metric: "patient_count" | "appointments_today" | "prescriptions_today" | "clinical_notes_count" | "active_medications" | "consent_compliance";
    clinicianId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    metric: "patient_count" | "appointments_today" | "prescriptions_today" | "clinical_notes_count" | "active_medications" | "consent_compliance";
    clinicianId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const SearchQuerySchema: z.ZodObject<{
    query: z.ZodString;
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<["patients", "prescriptions", "clinical_notes", "appointments", "all"]>>>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
    offset: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    type: "patients" | "all" | "prescriptions" | "appointments" | "clinical_notes";
    query: string;
    limit: number;
    offset: number;
}, {
    query: string;
    type?: "patients" | "all" | "prescriptions" | "appointments" | "clinical_notes" | undefined;
    limit?: string | undefined;
    offset?: string | undefined;
}>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
export type PatientQuery = z.infer<typeof PatientQuerySchema>;
export type CreatePrescription = z.infer<typeof CreatePrescriptionSchema>;
export type PrescriptionQuery = z.infer<typeof PrescriptionQuerySchema>;
export type CreateClinicalNote = z.infer<typeof CreateClinicalNoteSchema>;
export type ClinicalNoteQuery = z.infer<typeof ClinicalNoteQuerySchema>;
export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;
export type CreateConsent = z.infer<typeof CreateConsentSchema>;
export type ConsentQuery = z.infer<typeof ConsentQuerySchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type DocumentQuery = z.infer<typeof DocumentQuerySchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type CreateMedication = z.infer<typeof CreateMedicationSchema>;
export type UpdateMedication = z.infer<typeof UpdateMedicationSchema>;
export type MedicationQuery = z.infer<typeof MedicationQuerySchema>;
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
//# sourceMappingURL=schemas.d.ts.map