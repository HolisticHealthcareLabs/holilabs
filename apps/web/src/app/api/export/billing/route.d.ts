/**
 * Bulk Billing Export API
 *
 * POST /api/export/billing - Export SOAP notes for insurance billing
 *
 * Competitive Analysis:
 * - Abridge: ✅ CSV + PDF export with ICD-10/CPT codes
 * - Nuance DAX: ✅ Bulk export to EMR systems
 * - Suki: ✅ Billing code summary
 * - Doximity: ❌ No export (fax only)
 *
 * Impact: UNBLOCKS REVENUE - doctors can't bill insurance without this
 */
export declare const dynamic = "force-dynamic";
/**
 * POST /api/export/billing
 * Export SOAP notes for billing period
 */
export declare const POST: any;
//# sourceMappingURL=route.d.ts.map