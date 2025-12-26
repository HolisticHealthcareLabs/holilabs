/**
 * Metrics Middleware Plugin
 *
 * Fastify plugin that automatically records:
 * - HTTP request duration
 * - HTTP request count
 * - HTTP error count
 *
 * This runs on every request and provides comprehensive observability.
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { recordHttpRequest, httpRequestErrors } from '../services/monitoring/prometheus-metrics';

const metricsMiddleware: FastifyPluginAsync = async (server) => {
  // Hook: Before request is processed
  server.addHook('onRequest', async (request, reply) => {
    // Store start time on request object
    (request as any).startTime = Date.now();
  });

  // Hook: After response is sent
  server.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    if (!startTime) return;

    const durationMs = Date.now() - startTime;

    // Normalize route pattern (remove :params)
    // e.g., /fhir/export/patient/:patientTokenId -> /fhir/export/patient/:id
    const routePattern = normalizeRoute(request.url);

    // Record metrics
    recordHttpRequest(
      request.method,
      routePattern,
      reply.statusCode,
      durationMs
    );
  });

  // Hook: On error
  server.addHook('onError', async (request, reply, error) => {
    const routePattern = normalizeRoute(request.url);
    const errorType = error.name || 'UnknownError';

    httpRequestErrors.inc({
      method: request.method,
      route: routePattern,
      error_type: errorType,
    });
  });
};

/**
 * Normalize URL to route pattern
 * Replaces dynamic segments with placeholders
 */
function normalizeRoute(url: string): string {
  // Remove query parameters
  const pathWithoutQuery = url.split('?')[0];

  // Replace common dynamic segments
  let normalized = pathWithoutQuery
    // UUIDs and CUIDs (patient tokens, encounter IDs, etc.)
    .replace(/\/[a-z0-9]{20,}/gi, '/:id')
    // Numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Date-like patterns (YYYY-MM-DD)
    .replace(/\/\d{4}-\d{2}-\d{2}/g, '/:date')
    // Truncate very long URLs
    .substring(0, 100);

  return normalized || '/';
}

// Export as a plugin
export default fp(metricsMiddleware, {
  name: 'metrics-middleware',
  fastify: '4.x',
});
