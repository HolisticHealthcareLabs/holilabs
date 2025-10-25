/**
 * Prescription API - Create Prescription
 *
 * POST /api/prescriptions - Create new prescription with blockchain hash
 */
export declare const dynamic = "force-dynamic";
/**
 * POST /api/prescriptions
 * Create new prescription with e-signature
 * SECURITY: Enforces tenant isolation - clinicians can only create prescriptions for their own patients
 */
export declare const POST: any;
/**
 * GET /api/prescriptions?patientId=xxx
 * Get prescriptions for a patient
 * SECURITY: Enforces tenant isolation - clinicians can only view prescriptions for their own patients
 */
export declare const GET: any;
//# sourceMappingURL=route.d.ts.map