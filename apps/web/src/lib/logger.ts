/**
 * Client-safe logger shim.
 *
 * Why this exists:
 * - Some transports (e.g. S3 log shipping) depend on Node-only modules (`stream`, `zlib`).
 * - Importing them from client bundles crashes hydration (your current black screen).
 *
 * Behavior:
 * - In the browser: lightweight console-based logger
 * - On the server: delegates to `logger.server.ts`
 */

type LoggerLike = {
  trace: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  fatal: (...args: any[]) => void;
  child: (_bindings: Record<string, any>) => LoggerLike;
};

const isBrowser = typeof window !== 'undefined';

const consoleLogger: LoggerLike = {
  trace: (...args) => console.debug(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  fatal: (...args) => console.error(...args),
  child: () => consoleLogger,
};

function getServerModule(): any {
  // Important: keep this `require` inside a function so the client bundle never touches it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./logger.server');
}

export const logger: LoggerLike = isBrowser ? consoleLogger : (getServerModule().logger as LoggerLike);

export type Logger = any;

export const createLogger = (bindings: Record<string, any>) => {
  return isBrowser ? consoleLogger.child(bindings) : getServerModule().createLogger(bindings);
};

export const logError = (error: unknown): { err: Error } => {
  if (!isBrowser) return getServerModule().logError(error);
  if (error instanceof Error) return { err: error };
  return { err: new Error(typeof error === 'string' ? error : JSON.stringify(error)) };
};

export const createApiLogger = (request?: Request): any => {
  if (!isBrowser) return getServerModule().createApiLogger(request);
  // Minimal browser implementation (rarely used client-side).
  const requestId = request?.headers.get('x-request-id') || (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  return createLogger({ requestId, method: request?.method, url: request?.url });
};

export const logPerformance = (operation: string, startTime: number): { operation: string; duration: number } => {
  if (!isBrowser) return getServerModule().logPerformance(operation, startTime);
  return { operation, duration: Date.now() - startTime };
};

export default logger;
