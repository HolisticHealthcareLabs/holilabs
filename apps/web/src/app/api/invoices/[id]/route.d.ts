/**
 * Invoice Detail API
 *
 * GET /api/invoices/[id] - Get single invoice with line items
 * PATCH /api/invoices/[id] - Update invoice (change status, add line items, mark paid)
 * DELETE /api/invoices/[id] - Void invoice (soft delete)
 */
export declare const dynamic = "force-dynamic";
/**
 * GET /api/invoices/[id]
 * Get single invoice with full details
 */
export declare const GET: any;
/**
 * PATCH /api/invoices/[id]
 * Update invoice - change status, add line items, modify details, mark paid/void
 */
export declare const PATCH: any;
/**
 * DELETE /api/invoices/[id]
 * Void invoice (soft delete)
 * Note: In production, prefer voiding invoices over deleting them for audit trail
 */
export declare const DELETE: any;
//# sourceMappingURL=route.d.ts.map