/**
 * Sentry Error Monitoring Configuration
 *
 * Integrates Sentry for:
 * - Error tracking
 * - Performance monitoring
 * - User session replay (optional)
 * - Release tracking
 *
 * Setup Instructions:
 * 1. Create Sentry account: https://sentry.io/signup/
 * 2. Create new project (Next.js)
 * 3. Copy DSN to .env.production:
 *    SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
 *    NEXT_PUBLIC_SENTRY_DSN=same-as-above
 * 4. Run: pnpm add @sentry/nextjs
 * 5. Run: npx @sentry/wizard@latest -i nextjs
 */
/**
 * Initialize Sentry (call this in app layout or middleware)
 */
export declare function initSentry(): void;
/**
 * Manually capture an error
 */
export declare function captureError(error: Error, context?: Record<string, any>): void;
/**
 * Set user context (call after authentication)
 */
export declare function setUserContext(user: {
    id: string;
    email?: string;
    role?: string;
}): void;
/**
 * Clear user context (call on logout)
 */
export declare function clearUserContext(): void;
/**
 * Add breadcrumb (for debugging error context)
 */
export declare function addBreadcrumb(message: string, data?: Record<string, any>): void;
/**
 * Start transaction (for performance monitoring)
 */
export declare function startTransaction(name: string, op: string): any;
/**
 * Check if Sentry is initialized
 */
export declare function isSentryEnabled(): boolean;
//# sourceMappingURL=sentry.d.ts.map