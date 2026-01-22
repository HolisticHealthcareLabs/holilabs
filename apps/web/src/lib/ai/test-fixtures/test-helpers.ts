/**
 * Shared Test Utilities for AI Module
 *
 * DRY test patterns extracted from provider tests.
 * All data is SYNTHETIC - NO PHI
 *
 * @module test-fixtures/test-helpers
 */

// =============================================================================
// Mock Response Helpers
// =============================================================================

/**
 * Create a successful fetch response mock
 */
export function mockJsonResponse<T>(data: T, status = 200): {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
  text: () => Promise<string>;
} {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

/**
 * Create an error fetch response mock
 */
export function mockErrorResponse(
  status: number,
  message: string
): {
  ok: false;
  status: number;
  json: () => Promise<{ error: string }>;
  text: () => Promise<string>;
} {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  };
}

/**
 * Create a timeout error for testing retry behavior
 */
export function createTimeoutError(message = 'Request timed out'): Error {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

/**
 * Create a network error for testing fallback behavior
 */
export function createNetworkError(message = 'Network error'): Error {
  return new Error(message);
}

/**
 * Create a connection reset error for testing retry behavior
 */
export function createConnectionResetError(): Error {
  return new Error('ECONNRESET');
}

// =============================================================================
// PHI Logging Verification
// =============================================================================

/** Logger mock interface for type safety */
export interface LoggerMock {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
}

/**
 * Verify that no sensitive patterns appear in log calls.
 *
 * @param loggerMock - The mocked logger instance
 * @param sensitivePatterns - Patterns to check for (case-insensitive)
 * @throws AssertionError if any pattern is found in logs
 *
 * @example
 * ```ts
 * verifyNoPHIInLogs(logger, ['patient', 'ssn', 'dob']);
 * ```
 */
export function verifyNoPHIInLogs(
  loggerMock: LoggerMock,
  sensitivePatterns: string[]
): void {
  const allCalls = [
    ...loggerMock.info.mock.calls,
    ...loggerMock.error.mock.calls,
    ...loggerMock.warn.mock.calls,
    ...loggerMock.debug.mock.calls,
  ];

  allCalls.forEach((call: unknown[]) => {
    const logStr = JSON.stringify(call);
    sensitivePatterns.forEach((pattern) => {
      expect(logStr.toLowerCase()).not.toContain(pattern.toLowerCase());
    });
  });
}

/**
 * Verify that prompt content is never logged.
 *
 * @param loggerMock - The mocked logger instance
 * @param testPrompt - The prompt content that should not appear in logs
 *
 * @example
 * ```ts
 * await provider.generateResponse('Secret patient info');
 * verifyNoPromptInLogs(logger, 'Secret patient');
 * ```
 */
export function verifyNoPromptInLogs(
  loggerMock: LoggerMock,
  testPrompt: string
): void {
  const allCalls = [
    ...loggerMock.info.mock.calls,
    ...loggerMock.error.mock.calls,
    ...loggerMock.warn.mock.calls,
    ...loggerMock.debug.mock.calls,
  ];

  allCalls.forEach((call: unknown[]) => {
    const logObj = call[0] as Record<string, unknown>;
    expect(JSON.stringify(logObj)).not.toContain(testPrompt);
    expect(logObj).not.toHaveProperty('prompt');
    expect(logObj).not.toHaveProperty('content');
  });
}

/**
 * Verify that a sensitive value (like API key) is not logged.
 *
 * @param loggerMock - The mocked logger instance
 * @param sensitiveValue - The value that should not appear in logs
 *
 * @example
 * ```ts
 * const provider = new VLLMProvider({ apiKey: 'secret-key' });
 * await provider.generateResponse('Test');
 * verifyNoSensitiveValueInLogs(logger, 'secret-key');
 * ```
 */
export function verifyNoSensitiveValueInLogs(
  loggerMock: LoggerMock,
  sensitiveValue: string
): void {
  const allCalls = [
    ...loggerMock.info.mock.calls,
    ...loggerMock.error.mock.calls,
    ...loggerMock.warn.mock.calls,
    ...loggerMock.debug.mock.calls,
  ];

  allCalls.forEach((call: unknown[]) => {
    const logStr = JSON.stringify(call);
    expect(logStr).not.toContain(sensitiveValue);
  });
}

/**
 * Verify that response content is not logged.
 *
 * @param loggerMock - The mocked logger instance
 */
export function verifyNoResponseInLogs(loggerMock: LoggerMock): void {
  const allCalls = [
    ...loggerMock.info.mock.calls,
    ...loggerMock.debug.mock.calls,
  ];

  allCalls.forEach((call: unknown[]) => {
    const logObj = call[0] as Record<string, unknown>;
    expect(logObj).not.toHaveProperty('response');
  });
}

// =============================================================================
// Test Setup Utilities
// =============================================================================

/**
 * Standard environment setup for provider tests.
 * Backs up and cleans environment variables.
 *
 * @returns Object with cleanup function to restore original env
 *
 * @example
 * ```ts
 * let envCleanup: () => void;
 *
 * beforeEach(() => {
 *   envCleanup = setupTestEnvironment(['OLLAMA_BASE_URL', 'OLLAMA_MODEL']);
 * });
 *
 * afterAll(() => {
 *   envCleanup();
 * });
 * ```
 */
export function setupTestEnvironment(
  envVarsToDelete: string[]
): () => void {
  const originalEnv = { ...process.env };

  envVarsToDelete.forEach((key) => {
    delete process.env[key];
  });

  return () => {
    process.env = originalEnv;
  };
}

/**
 * Reset common mocks between tests.
 * Call in beforeEach.
 *
 * @param fetchMock - The global.fetch mock
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   resetMocks(global.fetch as jest.Mock);
 * });
 * ```
 */
export function resetMocks(fetchMock?: jest.Mock): void {
  jest.clearAllMocks();
  if (fetchMock) {
    fetchMock.mockReset();
  }
}

// =============================================================================
// Error Assertion Helpers
// =============================================================================

/**
 * Assert that an async operation throws a specific error message.
 *
 * @param operation - The async function that should throw
 * @param expectedMessage - The expected error message (partial match)
 *
 * @example
 * ```ts
 * await expectApiError(
 *   () => provider.generateResponse('Test'),
 *   'API error: 500'
 * );
 * ```
 */
export async function expectApiError(
  operation: () => Promise<unknown>,
  expectedMessage: string
): Promise<void> {
  await expect(operation()).rejects.toThrow(expectedMessage);
}

/**
 * Assert that a logger was called with a specific event.
 *
 * @param loggerMock - The mocked logger (info, error, etc.)
 * @param eventName - The expected event name
 * @param additionalFields - Optional additional fields to check
 *
 * @example
 * ```ts
 * expectLogEvent(logger.info, 'ollama_response', { model: 'phi3' });
 * ```
 */
export function expectLogEvent(
  loggerMock: jest.Mock,
  eventName: string,
  additionalFields?: Record<string, unknown>
): void {
  expect(loggerMock).toHaveBeenCalledWith(
    expect.objectContaining({
      event: eventName,
      ...additionalFields,
    })
  );
}

// =============================================================================
// Fetch Mock Helpers
// =============================================================================

/**
 * Configure global.fetch to return a successful JSON response.
 *
 * @param fetchMock - The global.fetch mock
 * @param responseData - The data to return
 *
 * @example
 * ```ts
 * mockFetchSuccess(global.fetch as jest.Mock, mockOllamaResponse);
 * ```
 */
export function mockFetchSuccess<T>(fetchMock: jest.Mock, responseData: T): void {
  fetchMock.mockResolvedValue(mockJsonResponse(responseData));
}

/**
 * Configure global.fetch to return an error response.
 *
 * @param fetchMock - The global.fetch mock
 * @param status - HTTP status code
 * @param message - Error message
 *
 * @example
 * ```ts
 * mockFetchError(global.fetch as jest.Mock, 500, 'Internal server error');
 * ```
 */
export function mockFetchError(
  fetchMock: jest.Mock,
  status: number,
  message: string
): void {
  fetchMock.mockResolvedValue(mockErrorResponse(status, message));
}

/**
 * Configure global.fetch to throw a network error.
 *
 * @param fetchMock - The global.fetch mock
 * @param error - The error to throw (defaults to network error)
 *
 * @example
 * ```ts
 * mockFetchNetworkError(global.fetch as jest.Mock);
 * // or with specific error:
 * mockFetchNetworkError(global.fetch as jest.Mock, createTimeoutError());
 * ```
 */
export function mockFetchNetworkError(
  fetchMock: jest.Mock,
  error: Error = createNetworkError()
): void {
  fetchMock.mockRejectedValue(error);
}
