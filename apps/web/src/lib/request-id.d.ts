/**
 * Request ID Generation and Tracking
 *
 * Generates unique IDs for every request to enable:
 * - End-to-end tracing across services
 * - Quick debugging (user reports "request ID xyz" → find exact logs)
 * - Performance monitoring
 */
export declare const REQUEST_ID_HEADER = "X-Request-ID";
/**
 * Generate a unique request ID
 * Format: UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)
 */
export declare function generateRequestId(): string;
/**
 * Extract request ID from headers or generate new one
 */
export declare function getOrCreateRequestId(headers: Headers): string;
/**
 * Add request ID to response headers
 */
export declare function addRequestIdToResponse(response: Response, requestId: string): Response;
//# sourceMappingURL=request-id.d.ts.map