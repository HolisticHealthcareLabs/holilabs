/**
 * Clinical Notes API
 *
 * POST /api/clinical-notes - Create clinical note
 * GET /api/clinical-notes?patientId=xxx - Get notes for patient
 */
export declare const dynamic = "force-dynamic";
/**
 * POST /api/clinical-notes
 * Create new clinical note with blockchain hash
 * SECURITY: Enforces tenant isolation - clinicians can only create notes for their own patients
 */
export declare const POST: any;
/**
 * GET /api/clinical-notes?patientId=xxx
 * Get clinical notes for a patient
 * SECURITY: Enforces tenant isolation - clinicians can only view notes for their own patients
 */
export declare const GET: any;
//# sourceMappingURL=route.d.ts.map