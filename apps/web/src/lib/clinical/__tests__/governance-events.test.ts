import { logSafetyEvent } from '../safety-audit-logger';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Mock prisma and logger
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback({
      interactionSession: { create: jest.fn().mockResolvedValue({ id: 'session-123' }) },
      governanceLog: { create: jest.fn().mockResolvedValue({ id: 'log-123' }) },
      governanceEvent: { create: jest.fn().mockResolvedValue({ id: 'event-123' }) }
    }))
  }
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('Safety Audit Logger', () => {
  test('logSafetyEvent persists to DB and logs to console', async () => {
    await logSafetyEvent({
      userId: 'user-1',
      patientId: 'patient-1',
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      severity: 'BLOCK',
      action: 'BLOCKED',
      rationale: 'Test rationale'
    });

    // Check Logger
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'CLINICAL_SAFETY_EVENT' }),
      expect.stringContaining('Safety Event')
    );

    // Check Prisma Transaction
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
