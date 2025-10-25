/**
 * Clinical Note Validation Schemas
 *
 * Zod schemas for validating SOAP notes and clinical documentation
 */
import { z } from 'zod';
declare const vitalSignsSchema: z.ZodNullable<z.ZodOptional<z.ZodObject<{
    bloodPressure: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    heartRate: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    temperature: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    respiratoryRate: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    oxygenSaturation: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    weight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    temperature?: number | null | undefined;
    bloodPressure?: string | null | undefined;
    heartRate?: number | null | undefined;
    respiratoryRate?: number | null | undefined;
    oxygenSaturation?: number | null | undefined;
    weight?: number | null | undefined;
}, {
    temperature?: number | null | undefined;
    bloodPressure?: string | null | undefined;
    heartRate?: number | null | undefined;
    respiratoryRate?: number | null | undefined;
    oxygenSaturation?: number | null | undefined;
    weight?: number | null | undefined;
}>>>;
declare const diagnosisSchema: z.ZodObject<{
    code: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    description: string;
}, {
    code: string;
    description: string;
}>;
declare const procedureSchema: z.ZodObject<{
    code: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    description: string;
}, {
    code: string;
    description: string;
}>;
/**
 * Create Clinical Note Schema
 * Used for POST /api/clinical-notes
 */
export declare const createClinicalNoteSchema: z.ZodEffects<z.ZodObject<{
    patientId: z.ZodString;
    authorId: z.ZodString;
    type: z.ZodEnum<["SOAP", "Progress", "Admission", "Discharge", "Procedure", "Emergency"]>;
    subjective: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    objective: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assessment: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    plan: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    vitalSigns: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        bloodPressure: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        heartRate: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        temperature: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        respiratoryRate: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        oxygenSaturation: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        weight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    }, {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    }>>>;
    diagnoses: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        description: string;
    }, {
        code: string;
        description: string;
    }>, "many">>>;
    procedures: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        description: string;
    }, {
        code: string;
        description: string;
    }>, "many">>>;
    sessionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    recordingDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency";
    patientId: string;
    authorId: string;
    subjective?: string | null | undefined;
    objective?: string | null | undefined;
    assessment?: string | null | undefined;
    plan?: string | null | undefined;
    diagnoses?: {
        code: string;
        description: string;
    }[] | null | undefined;
    procedures?: {
        code: string;
        description: string;
    }[] | null | undefined;
    vitalSigns?: {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    } | null | undefined;
    recordingDuration?: number | null | undefined;
    sessionId?: string | null | undefined;
}, {
    type: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency";
    patientId: string;
    authorId: string;
    subjective?: string | null | undefined;
    objective?: string | null | undefined;
    assessment?: string | null | undefined;
    plan?: string | null | undefined;
    diagnoses?: {
        code: string;
        description: string;
    }[] | null | undefined;
    procedures?: {
        code: string;
        description: string;
    }[] | null | undefined;
    vitalSigns?: {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    } | null | undefined;
    recordingDuration?: number | null | undefined;
    sessionId?: string | null | undefined;
}>, {
    type: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency";
    patientId: string;
    authorId: string;
    subjective?: string | null | undefined;
    objective?: string | null | undefined;
    assessment?: string | null | undefined;
    plan?: string | null | undefined;
    diagnoses?: {
        code: string;
        description: string;
    }[] | null | undefined;
    procedures?: {
        code: string;
        description: string;
    }[] | null | undefined;
    vitalSigns?: {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    } | null | undefined;
    recordingDuration?: number | null | undefined;
    sessionId?: string | null | undefined;
}, {
    type: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency";
    patientId: string;
    authorId: string;
    subjective?: string | null | undefined;
    objective?: string | null | undefined;
    assessment?: string | null | undefined;
    plan?: string | null | undefined;
    diagnoses?: {
        code: string;
        description: string;
    }[] | null | undefined;
    procedures?: {
        code: string;
        description: string;
    }[] | null | undefined;
    vitalSigns?: {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    } | null | undefined;
    recordingDuration?: number | null | undefined;
    sessionId?: string | null | undefined;
}>;
/**
 * Update Clinical Note Schema
 * Used for PUT /api/clinical-notes/[id]
 * All fields optional for partial updates
 */
export declare const updateClinicalNoteSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["SOAP", "Progress", "Admission", "Discharge", "Procedure", "Emergency"]>>;
    subjective: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    objective: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assessment: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    plan: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    vitalSigns: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        bloodPressure: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        heartRate: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        temperature: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        respiratoryRate: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        oxygenSaturation: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        weight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    }, {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    }>>>;
    diagnoses: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        description: string;
    }, {
        code: string;
        description: string;
    }>, "many">>>;
    procedures: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        description: string;
    }, {
        code: string;
        description: string;
    }>, "many">>>;
    dataHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type?: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency" | undefined;
    subjective?: string | null | undefined;
    objective?: string | null | undefined;
    assessment?: string | null | undefined;
    plan?: string | null | undefined;
    diagnoses?: {
        code: string;
        description: string;
    }[] | null | undefined;
    procedures?: {
        code: string;
        description: string;
    }[] | null | undefined;
    vitalSigns?: {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    } | null | undefined;
    dataHash?: string | null | undefined;
}, {
    type?: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency" | undefined;
    subjective?: string | null | undefined;
    objective?: string | null | undefined;
    assessment?: string | null | undefined;
    plan?: string | null | undefined;
    diagnoses?: {
        code: string;
        description: string;
    }[] | null | undefined;
    procedures?: {
        code: string;
        description: string;
    }[] | null | undefined;
    vitalSigns?: {
        temperature?: number | null | undefined;
        bloodPressure?: string | null | undefined;
        heartRate?: number | null | undefined;
        respiratoryRate?: number | null | undefined;
        oxygenSaturation?: number | null | undefined;
        weight?: number | null | undefined;
    } | null | undefined;
    dataHash?: string | null | undefined;
}>;
/**
 * Clinical Note Query Params Schema
 * Used for GET /api/clinical-notes (list with filters)
 */
export declare const clinicalNoteQuerySchema: z.ZodObject<{
    patientId: z.ZodOptional<z.ZodString>;
    authorId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["SOAP", "Progress", "Admission", "Discharge", "Procedure", "Emergency"]>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    type?: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency" | undefined;
    search?: string | undefined;
    patientId?: string | undefined;
    authorId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    type?: "SOAP" | "Progress" | "Admission" | "Discharge" | "Procedure" | "Emergency" | undefined;
    search?: string | undefined;
    limit?: string | undefined;
    patientId?: string | undefined;
    authorId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    page?: string | undefined;
}>;
export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>;
export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>;
export type ClinicalNoteQueryInput = z.infer<typeof clinicalNoteQuerySchema>;
export type VitalSigns = z.infer<typeof vitalSignsSchema>;
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export type Procedure = z.infer<typeof procedureSchema>;
export {};
//# sourceMappingURL=clinical-note.schema.d.ts.map