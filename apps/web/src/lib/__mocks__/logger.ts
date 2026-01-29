/**
 * Jest Manual Mock for Logger
 *
 * This mock prevents PHI from being logged during tests
 * and allows assertions on logging behavior.
 */

interface MockLogger {
  trace: jest.Mock;
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  fatal: jest.Mock;
  child: jest.Mock;
}

const mockLogger: MockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn((): MockLogger => mockLogger),
};

// Also export named helpers to match `src/lib/logger.ts` exports.
// This keeps tests robust regardless of default vs named import style.
export const logger = mockLogger;
export const createLogger = jest.fn(() => mockLogger);
export const logError = jest.fn((error: unknown) => ({
  err: error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error)),
}));
export const createApiLogger = jest.fn(() => mockLogger);
export const logPerformance = jest.fn((operation: string, startTime: number) => ({
  operation,
  duration: Date.now() - startTime,
}));

export default mockLogger;
