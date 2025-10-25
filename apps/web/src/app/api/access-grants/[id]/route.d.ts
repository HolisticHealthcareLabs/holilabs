/**
 * Data Access Grant Detail API
 *
 * GET /api/access-grants/[id] - Get single access grant
 * PATCH /api/access-grants/[id] - Update access grant (revoke, extend, modify permissions)
 * DELETE /api/access-grants/[id] - Delete access grant
 */
export declare const dynamic = "force-dynamic";
/**
 * GET /api/access-grants/[id]
 * Get single access grant with full details
 */
export declare const GET: any;
/**
 * PATCH /api/access-grants/[id]
 * Update access grant - revoke, extend expiration, or modify permissions
 */
export declare const PATCH: any;
/**
 * DELETE /api/access-grants/[id]
 * Delete access grant (hard delete - use with caution)
 * Note: In production, prefer revoking grants over deleting them for audit trail
 */
export declare const DELETE: any;
//# sourceMappingURL=route.d.ts.map