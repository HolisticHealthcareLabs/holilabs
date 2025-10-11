/**
 * Sentry Utility Functions
 *
 * Helper functions for error reporting and monitoring with Sentry
 * Provides consistent error context and sanitization
 */

import * as Sentry from '@sentry/nextjs';

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
export function captureError(
  error: Error | unknown,
  context?: ErrorContext
): string {
  // Set user context if provided
  if (context?.user) {
    Sentry.setUser({
      id: context.user.id,
      email: context.user.email,
      role: context.user.role,
    });
  }

  // Set tags if provided
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  // Capture the exception
  const eventId = Sentry.captureException(error, {
    level: context?.level || 'error',
    contexts: {
      custom: context?.extra,
    },
    fingerprint: context?.fingerprint,
  });

  return eventId;
}

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
export function captureMessage(
  message: string,
  context?: ErrorContext
): string {
  // Set user context if provided
  if (context?.user) {
    Sentry.setUser({
      id: context.user.id,
      email: context.user.email,
      role: context.user.role,
    });
  }

  // Set tags if provided
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  // Capture the message
  const eventId = Sentry.captureMessage(message, {
    level: context?.level || 'info',
    contexts: {
      custom: context?.extra,
    },
    fingerprint: context?.fingerprint,
  });

  return eventId;
}

/**
 * Set user context for all subsequent errors
 */
export function setUserContext(user: UserContext | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
      type: user.type,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

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
export function addBreadcrumb(
  message: string,
  options?: {
    category?: string;
    level?: ErrorSeverity;
    data?: Record<string, any>;
  }
): void {
  Sentry.addBreadcrumb({
    message,
    category: options?.category || 'custom',
    level: options?.level || 'info',
    data: options?.data,
    timestamp: Date.now() / 1000,
  });
}

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
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, context);
      throw error; // Re-throw to allow caller to handle
    }
  }) as T;
}

/**
 * Report API error with context
 */
export function captureApiError(
  error: Error | unknown,
  endpoint: string,
  method: string,
  statusCode?: number,
  requestId?: string
): string {
  return captureError(error, {
    tags: {
      api_endpoint: endpoint,
      api_method: method,
      api_status: statusCode?.toString() || 'unknown',
    },
    extra: {
      requestId,
      endpoint,
      method,
      statusCode,
    },
  });
}

/**
 * Report database error with context
 */
export function captureDatabaseError(
  error: Error | unknown,
  operation: string,
  table?: string,
  recordId?: string
): string {
  return captureError(error, {
    tags: {
      db_operation: operation,
      db_table: table || 'unknown',
    },
    extra: {
      operation,
      table,
      recordId,
    },
  });
}

/**
 * Report authentication error
 */
export function captureAuthError(
  error: Error | unknown,
  authType: 'login' | 'logout' | 'signup' | 'verify' | 'refresh',
  userId?: string
): string {
  return captureError(error, {
    tags: {
      auth_type: authType,
    },
    extra: {
      authType,
      userId,
    },
  });
}

/**
 * Report file operation error
 */
export function captureFileError(
  error: Error | unknown,
  operation: 'upload' | 'download' | 'delete' | 'encrypt' | 'decrypt',
  fileName?: string,
  fileSize?: number
): string {
  return captureError(error, {
    tags: {
      file_operation: operation,
    },
    extra: {
      operation,
      fileName,
      fileSize,
    },
  });
}

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
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | undefined {
  return Sentry.startTransaction({
    name,
    op,
  });
}

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
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = startTransaction(name, 'function');

  try {
    const result = await fn();
    transaction?.setStatus('ok');
    return result;
  } catch (error) {
    transaction?.setStatus('internal_error');
    throw error;
  } finally {
    transaction?.finish();
  }
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    !!process.env.NEXT_PUBLIC_SENTRY_DSN
  );
}
