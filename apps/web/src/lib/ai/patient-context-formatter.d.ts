/**
 * Patient Context Formatter for AI Prompts
 *
 * Formats patient metadata into structured context for AI models
 * Used in: SOAP notes, clinical scribe, AI assistant
 */
import { Patient, Medication, Appointment, Consent } from '@prisma/client';
export interface PatientWithRelations extends Patient {
    medications?: Medication[];
    appointments?: Appointment[];
    consents?: Consent[];
}
export interface FormattedPatientContext {
    demographics: string;
    medicalHistory: string;
    currentMedications: string;
    allergies: string;
    recentVisits: string;
    fullContext: string;
}
/**
 * Calculate patient's age from date of birth
 */
export declare function calculateAge(dateOfBirth: Date): number;
/**
 * Main function: Format complete patient context for AI
 */
export declare function formatPatientContext(patient: PatientWithRelations): FormattedPatientContext;
/**
 * Format patient context for SOAP note generation
 */
export declare function formatPatientContextForSOAP(patient: PatientWithRelations, chiefComplaint: string): string;
/**
 * Format patient context for clinical scribe
 */
export declare function formatPatientContextForScribe(patient: PatientWithRelations, appointmentReason: string): string;
/**
 * Format brief patient summary (for quick reference)
 */
export declare function formatPatientSummary(patient: PatientWithRelations): string;
/**
 * Format patient context for AI assistant general queries
 */
export declare function formatPatientContextForAI(patient: PatientWithRelations, query: string): string;
//# sourceMappingURL=patient-context-formatter.d.ts.map