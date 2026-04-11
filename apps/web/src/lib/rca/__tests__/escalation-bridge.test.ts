import {
  checkOverdueActions,
  createEscalationForOverdueAction,
  _computeDaysOverdue,
  _severityFromDaysOverdue,
} from '../escalation-bridge';

describe('escalation-bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_severityFromDaysOverdue', () => {
    it('returns LOW for 0-3 days overdue', () => {
      expect(_severityFromDaysOverdue(0)).toBe('LOW');
      expect(_severityFromDaysOverdue(3)).toBe('LOW');
    });

    it('returns MODERATE for 4-7 days overdue', () => {
      expect(_severityFromDaysOverdue(4)).toBe('MODERATE');
      expect(_severityFromDaysOverdue(7)).toBe('MODERATE');
    });

    it('returns HIGH for 8-14 days overdue', () => {
      expect(_severityFromDaysOverdue(8)).toBe('HIGH');
      expect(_severityFromDaysOverdue(14)).toBe('HIGH');
    });

    it('returns CRITICAL for >14 days overdue', () => {
      expect(_severityFromDaysOverdue(15)).toBe('CRITICAL');
      expect(_severityFromDaysOverdue(30)).toBe('CRITICAL');
    });
  });

  describe('checkOverdueActions', () => {
    it('returns overdue actions with computed daysOverdue', async () => {
      const deadline = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const mockPrisma = {
        safetyCorrectiveAction: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'act-1', incidentId: 'inc-1', deadline },
          ]),
        },
      } as any;

      const result = await checkOverdueActions(mockPrisma);

      expect(result).toHaveLength(1);
      expect(result[0].actionId).toBe('act-1');
      expect(result[0].incidentId).toBe('inc-1');
      expect(result[0].daysOverdue).toBeGreaterThanOrEqual(4);
      expect(mockPrisma.safetyCorrectiveAction.findMany).toHaveBeenCalledWith({
        where: {
          deadline: { lt: expect.any(Date) },
          status: { notIn: ['COMPLETED', 'VERIFIED'] },
        },
        select: { id: true, incidentId: true, deadline: true },
      });
    });

    it('returns empty array when no overdue actions', async () => {
      const mockPrisma = {
        safetyCorrectiveAction: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as any;

      const result = await checkOverdueActions(mockPrisma);
      expect(result).toEqual([]);
    });
  });

  describe('createEscalationForOverdueAction', () => {
    const baseAction = {
      id: 'act-1',
      incidentId: 'inc-1',
      description: 'Redesign the medication verification workflow',
      responsibleId: 'user-1',
      deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };

    it('creates a SafetyEscalation DB record', async () => {
      const mockRecord = {
        id: 'esc-1',
        incidentId: 'inc-1',
        correctiveActionId: 'act-1',
        severity: 'HIGH',
        title: '[SAFETY] Overdue corrective action: Redesign the medication verification workflow',
        description: expect.stringContaining('10 day(s) overdue'),
        assignedToId: 'user-1',
        daysOverdue: expect.any(Number),
      };
      const mockPrisma = {
        safetyEscalation: {
          create: jest.fn().mockResolvedValue(mockRecord),
        },
      } as any;

      const result = await createEscalationForOverdueAction(
        mockPrisma,
        baseAction,
        'tenant-1',
      );

      expect(result.id).toBe('esc-1');
      expect(mockPrisma.safetyEscalation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          incidentId: 'inc-1',
          correctiveActionId: 'act-1',
          assignedToId: 'user-1',
        }),
      });
    });

    it('emits safety.escalation.created event when eventBus is provided', async () => {
      const mockRecord = { id: 'esc-2', incidentId: 'inc-1', correctiveActionId: 'act-1' };
      const mockPrisma = {
        safetyEscalation: {
          create: jest.fn().mockResolvedValue(mockRecord),
        },
      } as any;
      const mockEventBus = {
        publish: jest.fn().mockResolvedValue('msg-id'),
      } as any;

      await createEscalationForOverdueAction(
        mockPrisma,
        baseAction,
        'tenant-1',
        mockEventBus,
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'safety.escalation.created',
          payload: expect.objectContaining({
            escalationId: 'esc-2',
            incidentId: 'inc-1',
            correctiveActionId: 'act-1',
            tenantId: 'tenant-1',
          }),
        }),
      );
    });

    it('does not call eventBus when not provided', async () => {
      const mockPrisma = {
        safetyEscalation: {
          create: jest.fn().mockResolvedValue({ id: 'esc-3' }),
        },
      } as any;

      await createEscalationForOverdueAction(mockPrisma, baseAction, 'tenant-1');
      // No error thrown, function completes without eventBus
    });

    it('truncates long descriptions in escalation title', async () => {
      const longAction = {
        ...baseAction,
        description: 'A'.repeat(200),
      };
      const mockPrisma = {
        safetyEscalation: {
          create: jest.fn().mockResolvedValue({ id: 'esc-4' }),
        },
      } as any;

      await createEscalationForOverdueAction(mockPrisma, longAction, 'tenant-1');

      const createCall = mockPrisma.safetyEscalation.create.mock.calls[0][0];
      expect(createCall.data.title.length).toBeLessThanOrEqual(120);
      expect(createCall.data.title).toContain('...');
    });
  });
});
