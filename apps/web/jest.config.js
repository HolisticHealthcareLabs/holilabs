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

  // Module paths
  moduleNameMapper: {
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
  ],

  // Transform ESM modules in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@auth|next-auth|@prisma)/)',
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
  resetMocks: true,
  restoreMocks: true,
};

// Export config
module.exports = createJestConfig(customJestConfig);
