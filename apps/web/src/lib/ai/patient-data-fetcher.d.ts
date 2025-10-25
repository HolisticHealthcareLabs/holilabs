/**
 * Patient Data Fetcher
 *
 * Utility functions to fetch patient data with all related information
 * for AI context generation
 */
import { PatientWithRelations } from './patient-context-formatter';
/**
 * Fetch patient with all related data for AI context
 */
export declare function fetchPatientWithContext(patientId: string): Promise<PatientWithRelations | null>;
/**
 * Fetch patient by MRN with all related data
 */
export declare function fetchPatientByMRN(mrn: string): Promise<PatientWithRelations | null>;
/**
 * Fetch patient for a specific appointment
 */
export declare function fetchPatientForAppointment(appointmentId: string): Promise<PatientWithRelations | null>;
/**
 * Search patients with context (for AI assistant)
 */
export declare function searchPatientsWithContext(searchTerm: string, limit?: number): Promise<PatientWithRelations[]>;
/**
 * Fetch recent patients (for dashboard)
 */
export declare function fetchRecentPatients(clinicianId: string, limit?: number): Promise<PatientWithRelations[]>;
//# sourceMappingURL=patient-data-fetcher.d.ts.map