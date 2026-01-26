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

  // Test match patterns - only match tests inside src/
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // Ignore patterns (use double backslash for regex special chars)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/out/',
    '/build/',
    '/tests/',         // All tests/ directory tests (E2E/load/smoke) run with Playwright/k6, not Jest
    '\\.skip\\.ts$',   // Skip .skip.ts files (temporarily disabled tests)
    '\\.manual\\.ts$', // Skip .manual.ts files (manual verification scripts)
    '\\.fixture\\.ts$', // Skip .fixture.ts files (test fixtures, not tests)
    '__tests__/fixtures/', // Skip files in __tests__/fixtures directories
    'cdss-test-data',  // Skip CDSS test data files
  ],

  // Transform ESM modules in node_modules
  // Pattern handles both regular node_modules and pnpm's .pnpm folder structure
  // For pnpm, scoped packages use + instead of / (e.g., @auth/prisma-adapter becomes @auth+prisma-adapter)
  transformIgnorePatterns: [
    'node_modules/(?!(@auth/|next-auth|@prisma/|@auth\\+|next-auth\\+|@prisma\\+|uuid))',
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
