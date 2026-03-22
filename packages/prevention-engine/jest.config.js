/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@holi/data-ingestion$': '<rootDir>/../data-ingestion/src/index.ts',
    '^@holi/event-bus$': '<rootDir>/../event-bus/src/index.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        skipLibCheck: true,
        composite: false,
        resolveJsonModule: true,
        paths: {
          '@holi/data-ingestion': ['../data-ingestion/src/index.ts'],
          '@holi/event-bus': ['../event-bus/src/index.ts'],
        },
      },
    },
  },
};
