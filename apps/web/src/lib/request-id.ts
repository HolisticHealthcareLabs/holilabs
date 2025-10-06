/**
 * Request ID Generation and Tracking
 *
 * Generates unique IDs for every request to enable:
 * - End-to-end tracing across services
 * - Quick debugging (user reports "request ID xyz" → find exact logs)
 * - Performance monitoring
 */

import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Generate a unique request ID
 * Format: UUID v4 (e.g., 550e8400-e29b-41d4-a716-446655440000)
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Extract request ID from headers or generate new one
 */
export function getOrCreateRequestId(headers: Headers): string {
  const existingId = headers.get(REQUEST_ID_HEADER);
  return existingId || generateRequestId();
}

/**
 * Add request ID to response headers
 */
export function addRequestIdToResponse(
  response: Response,
  requestId: string
): Response {
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
