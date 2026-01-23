/**
 * Mock for uuid module
 * Provides deterministic UUIDs for testing
 */

let counter = 0;

export const v4 = jest.fn(() => `test-uuid-${++counter}`);

export const v1 = jest.fn(() => `test-uuid-v1-${++counter}`);

// Reset counter between tests
export const __resetCounter = () => {
  counter = 0;
};

export default { v4, v1 };
