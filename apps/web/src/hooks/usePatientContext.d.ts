/**
 * usePatientContext Hook
 *
 * React hook to fetch and format patient context for AI prompts
 */
export type ContextFormat = 'full' | 'soap' | 'scribe' | 'summary';
interface UsePatientContextOptions {
    patientId: string;
    format?: ContextFormat;
    chiefComplaint?: string;
    appointmentReason?: string;
    autoFetch?: boolean;
}
interface PatientContextResult {
    context: any;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}
export declare function usePatientContext({ patientId, format, chiefComplaint, appointmentReason, autoFetch, }: UsePatientContextOptions): PatientContextResult;
/**
 * Hook specifically for SOAP note generation
 */
export declare function usePatientContextForSOAP(patientId: string, chiefComplaint: string): PatientContextResult;
/**
 * Hook specifically for clinical scribe
 */
export declare function usePatientContextForScribe(patientId: string, appointmentReason: string): PatientContextResult;
/**
 * Hook for patient summary (quick view)
 */
export declare function usePatientSummary(patientId: string): PatientContextResult;
export {};
//# sourceMappingURL=usePatientContext.d.ts.map