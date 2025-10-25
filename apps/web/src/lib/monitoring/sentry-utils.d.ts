/**
 * Sentry Utility Functions
 *
 * Helper functions for error reporting and monitoring with Sentry
 * Provides consistent error context and sanitization
 */
/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
/**
 * User context for error reporting
 */
export interface UserContext {
    id: string;
    email?: string;
    role?: string;
    type?: 'CLINICIAN' | 'PATIENT';
}
/**
 * Additional error context
 */
export interface ErrorContext {
    user?: UserContext;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    fingerprint?: string[];
    level?: ErrorSeverity;
}
/**
 * Capture an exception with Sentry
 *
 * @example
 * ```typescript
 * try {
 *   await savePatient(data);
 * } catch (error) {
 *   captureError(error, {
 *     user: { id: userId, type: 'CLINICIAN' },
 *     tags: { feature: 'patient-management' },
 *     extra: { patientId: data.id },
 *   });
 * }
 * ```
 */
export declare function captureError(error: Error | unknown, context?: ErrorContext): string;
/**
 * Capture a message with Sentry (non-error logging)
 *
 * @example
 * ```typescript
 * captureMessage('User completed onboarding', {
 *   level: 'info',
 *   user: { id: userId },
 *   tags: { feature: 'onboarding' },
 * });
 * ```
 */
export declare function captureMessage(message: string, context?: ErrorContext): string;
/**
 * Set user context for all subsequent errors
 */
export declare function setUserContext(user: UserContext | null): void;
/**
 * Clear user context
 */
export declare function clearUserContext(): void;
/**
 * Add breadcrumb for debugging
 *
 * @example
 * ```typescript
 * addBreadcrumb('User clicked save button', {
 *   category: 'ui.click',
 *   data: { patientId: '123' },
 * });
 * ```
 */
export declare function addBreadcrumb(message: string, options?: {
    category?: string;
    level?: ErrorSeverity;
    data?: Record<string, any>;
}): void;
/**
 * Wrap an async function with error reporting
 *
 * @example
 * ```typescript
 * const savePatientSafe = withErrorReporting(
 *   async (data) => await savePatient(data),
 *   { tags: { feature: 'patient-management' } }
 * );
 * ```
 */
export declare function withErrorReporting<T extends (...args: any[]) => Promise<any>>(fn: T, context?: ErrorContext): T;
/**
 * Report API error with context
 */
export declare function captureApiError(error: Error | unknown, endpoint: string, method: string, statusCode?: number, requestId?: string): string;
/**
 * Report database error with context
 */
export declare function captureDatabaseError(error: Error | unknown, operation: string, table?: string, recordId?: string): string;
/**
 * Report authentication error
 */
export declare function captureAuthError(error: Error | unknown, authType: 'login' | 'logout' | 'signup' | 'verify' | 'refresh', userId?: string): string;
/**
 * Report file operation error
 */
export declare function captureFileError(error: Error | unknown, operation: 'upload' | 'download' | 'delete' | 'encrypt' | 'decrypt', fileName?: string, fileSize?: number): string;
/**
 * Start a performance transaction
 *
 * @example
 * ```typescript
 * const transaction = startTransaction('patient.save', 'db.operation');
 * try {
 *   await savePatient(data);
 * } finally {
 *   transaction.finish();
 * }
 * ```
 */
export declare function startTransaction(name: string, op: string): any | undefined;
/**
 * Measure async function performance
 *
 * @example
 * ```typescript
 * const result = await measurePerformance(
 *   'patient.save',
 *   async () => await savePatient(data)
 * );
 * ```
 */
export declare function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T>;
/**
 * Check if Sentry is enabled
 */
export declare function isSentryEnabled(): boolean;
//# sourceMappingURL=sentry-utils.d.ts.map