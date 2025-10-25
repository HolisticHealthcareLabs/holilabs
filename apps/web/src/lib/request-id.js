"use strict";
/**
 * Request ID Generation and Tracking
 *
 * Generates unique IDs for every request to enable:
 * - End-to-end tracing across services
 * - Quick debugging (user reports "request ID xyz" → find exact logs)
 * - Performance monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_ID_HEADER = void 0;
exports.generateRequestId = generateRequestId;
exports.getOrCreateRequestId = getOrCreateRequestId;
exports.addRequestIdToResponse = addRequestIdToResponse;
const crypto_1 = require("crypto");
exports.REQUEST_ID_HEADER = 'X-Request-ID';
/**
 * Generate a unique request ID
 * Format: UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)
 */
function generateRequestId() {
    return (0, crypto_1.randomUUID)();
}
/**
 * Extract request ID from headers or generate new one
 */
function getOrCreateRequestId(headers) {
    const existingId = headers.get(exports.REQUEST_ID_HEADER);
    return existingId || generateRequestId();
}
/**
 * Add request ID to response headers
 */
function addRequestIdToResponse(response, requestId) {
    const headers = new Headers(response.headers);
    headers.set(exports.REQUEST_ID_HEADER, requestId);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
//# sourceMappingURL=request-id.js.map