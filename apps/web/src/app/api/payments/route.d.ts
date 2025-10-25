/**
 * Payments API
 * HIPAA-compliant payment processing and management
 *
 * GET /api/payments - List payments for a patient
 * POST /api/payments - Create new payment (process payment)
 */
export declare const dynamic = "force-dynamic";
/**
 * GET /api/payments
 * List payments for a patient
 * Query params: patientId (required), invoiceId, status, paymentMethod
 */
export declare const GET: any;
/**
 * POST /api/payments
 * Create new payment (process payment)
 * NOTE: This is a simplified version. In production, integrate with Stripe API
 */
export declare const POST: any;
//# sourceMappingURL=route.d.ts.map