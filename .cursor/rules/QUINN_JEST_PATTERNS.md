# Jest Mocking Patterns — QUINN Quality Gate

Core rule: NEVER use ES6 import for mocked modules. Use require() after jest.mock().

---

## Canonical Pattern

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { prisma } = require('@/lib/prisma');
(prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);

---

## Reset

beforeEach(() => { jest.clearAllMocks(); });

## Rejected Value

(prisma.patient.findUnique as jest.Mock).mockRejectedValue(new Error('Database unavailable'));

## Sequential Returns

let callCount = 0;
(prisma.job.findUnique as jest.Mock).mockImplementation(() => {
  return Promise.resolve(jobStates[callCount++]);
});
