/**
 * Mock logger for testing
 * Replaces pino logger with jest mock functions
 */

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn(() => mockLogger),
};

export const logger = mockLogger;
export const createLogger = jest.fn(() => mockLogger);
export const createApiLogger = jest.fn(() => mockLogger);
export const logError = jest.fn((error: unknown) => ({ err: error instanceof Error ? error : new Error(String(error)) }));
export const logPerformance = jest.fn((operation: string, startTime: number) => ({
  operation,
  duration: Date.now() - startTime,
}));

export default mockLogger;
