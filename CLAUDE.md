# Project Memory & Rules

## 🛡️ CRITICAL PROTOCOL: HUMAN-ONLY VERSION CONTROL
1. You are STRICTLY FORBIDDEN from executing `git commit` or `git push`.
2. You may use `git add` only if I explicitly approve.
3. You must DRAFT commit messages for me, but I will execute the command.
4. I am the only one allowed to push to production.

## 🧪 Jest Mocking Pattern (CDSS V3)

### Correct Pattern for Prisma/Logger Mocks

When mocking modules in Jest with ES6 imports, use `require()` AFTER `jest.mock()`:

```typescript
// ✅ CORRECT: Mock first, then require
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    // ... other models
  },
}));

jest.mock('@/lib/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import the mock AFTER jest.mock()
const { prisma } = require('@/lib/prisma');

// Now use in tests
(prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
```

### Why This Works
- `jest.mock()` is hoisted to the top of the file
- ES6 imports are also hoisted, causing race conditions
- `require()` executes at runtime, after mocks are set up

### Type Safety
Use `as jest.Mock` for type assertion when setting up return values.

### Common Patterns

**Reset mocks between tests:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

**Mock rejected values for error testing:**
```typescript
(prisma.patient.findUnique as jest.Mock).mockRejectedValue(
  new Error('Database unavailable')
);
```

**Sequential mock responses:**
```typescript
let callCount = 0;
(prisma.job.findUnique as jest.Mock).mockImplementation(() => {
  return Promise.resolve(jobStates[callCount++]);
});
