/**
 * Jest Configuration for Next.js + Prisma
 * Supports TypeScript, ESM, and Next.js conventions
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Path to Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test environment
  testEnvironment: 'jest-environment-node',

  // Use a local sequencer to avoid resolution issues with pnpm workspaces.
  testSequencer: '<rootDir>/jest.sequencer.cjs',

  // Module paths
  moduleNameMapper: {
    // Note: @/lib/auth is NOT mapped here - each test file should use jest.mock
    // to set up its own auth mock with appropriate return values
    '^@med-app/types$': '<rootDir>/src/lib/__mocks__/@med-app/types.ts',
    '^@auth/prisma-adapter$': '<rootDir>/src/lib/__mocks__/@auth/prisma-adapter.ts',
    // Mock next-auth ESM modules (must include all entry points)
    '^next-auth$': '<rootDir>/src/lib/__mocks__/next-auth.ts',
    '^next-auth/providers/google$': '<rootDir>/src/lib/__mocks__/next-auth-providers-google.ts',
    '^@auth/core/providers/google$': '<rootDir>/src/lib/__mocks__/next-auth-providers-google.ts',
    '^@auth/core$': '<rootDir>/src/lib/__mocks__/next-auth.ts',
    // Mock uuid ESM module
    '^uuid$': '<rootDir>/src/lib/__mocks__/uuid.ts',
    // Mock workspace packages
    '^@holi/deid$': '<rootDir>/src/lib/__mocks__/@holi/deid.ts',
    // General path alias (must come AFTER specific overrides)
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '!**/*.manual.[jt]s', // Exclude manual test scripts
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/out/',
    '/build/',
    '<rootDir>/tests/', // All tests/ directory tests (E2E/load/smoke) run with Playwright/k6, not Jest
    '\\.skip\\.',      // Skip .skip.ts files (temporarily disabled tests)
    '\\.manual\\.',    // Skip .manual.ts files (manual verification scripts)
    '/fixtures/',      // Skip fixture files (test data, not tests themselves)
  ],

  // Transform ESM modules in node_modules and workspace packages
  transformIgnorePatterns: [
    'node_modules/(?!(@auth|next-auth|@prisma|uuid|@holi)/)',
  ],

  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,

  // Max workers (parallel tests)
  maxWorkers: '50%',

  // Timeouts
  testTimeout: 30000, // 30 seconds for integration tests

  // Clear mocks between tests
  clearMocks: true,
  // Note: resetMocks and restoreMocks disabled to allow moduleNameMapper mocks with default values to persist
  // resetMocks: true,
  // restoreMocks: true,
};

// Export config
module.exports = createJestConfig(customJestConfig);
