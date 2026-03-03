/**
 * KPI Queries Tests
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    governanceEvent: {
      count: jest.fn(),
    },
    scheduledReminder: {
      count: jest.fn(),
    },
    escalation: {
      count: jest.fn(),
    },
    assuranceEvent: {
      count: jest.fn(),
    },
    preventionPlan: {
      count: jest.fn(),
    },
    prescription: {
      count: jest.fn(),
    },
  },
}));

import { getKPI, getAllKPIs } from '../kpi-queries';
import { prisma } from '@/lib/prisma';

describe('KPI Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // GOVERNANCE KPIs (existing)
  // ========================================================================

  describe('Total Evaluations', () => {
    it('KPI-001: Total evaluations query returns count', async () => {
      (prisma.governanceEvent.count as jest.Mock).mockResolvedValue(42);

      const result = await getKPI('totalEvaluations', {
        startDate: '2026-02-01',
        endDate: '2026-02-11',
      });

      expect(result).toEqual({
        value: 42,
        unit: 'count',
        label: 'Total Evaluations',
      });
    });

    it('returns zero when no evaluations found', async () => {
      (prisma.governanceEvent.count as jest.Mock).mockResolvedValue(0);

      const result = await getKPI('totalEvaluations');

      expect(result.value).toBe(0);
      expect(result.unit).toBe('count');
    });
  });

  describe('Block Rate', () => {
    it('KPI-002: Block rate is (blocks / total evaluations)', async () => {
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5);

      const result = await getKPI('blockRate', {
        startDate: '2026-02-01',
        endDate: '2026-02-11',
      });

      expect(result.value).toBe(5);
      expect(result.unit).toBe('percentage');
      expect(result.label).toBe('Block Rate');
    });

    it('returns 0% when no evaluations', async () => {
      (prisma.governanceEvent.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('blockRate');

      expect(result.value).toBe(0);
      expect(result.unit).toBe('percentage');
    });

    it('handles 100% block rate', async () => {
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(50);

      const result = await getKPI('blockRate');

      expect(result.value).toBe(100);
    });
  });

  describe('Override Rate', () => {
    it('calculates override rate from blocked/flagged items', async () => {
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(5);

      const result = await getKPI('overrideRate');

      expect(result.value).toBe(10);
      expect(result.unit).toBe('percentage');
    });

    it('returns 0% when no at-risk items', async () => {
      (prisma.governanceEvent.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('overrideRate');

      expect(result.value).toBe(0);
    });
  });

  describe('Attestation Compliance', () => {
    it('KPI-004: Attestation compliance is (attested / required)', async () => {
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(95);

      const result = await getKPI('attestationCompliance');

      expect(result.value).toBe(95);
      expect(result.unit).toBe('percentage');
    });

    it('returns 100% when no required attestations', async () => {
      (prisma.governanceEvent.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('attestationCompliance');

      expect(result.value).toBe(100);
    });
  });

  // ========================================================================
  // NEW KPIs (5-8)
  // ========================================================================

  describe('Reminder Reach', () => {
    it('calculates percentage of sent reminders', async () => {
      (prisma.scheduledReminder.count as jest.Mock)
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(150); // sent

      const result = await getKPI('reminderReach');

      expect(result.value).toBe(75);
      expect(result.unit).toBe('percentage');
      expect(result.label).toBe('Reminder Reach');
    });

    it('returns 0% when no reminders exist', async () => {
      (prisma.scheduledReminder.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('reminderReach');

      expect(result.value).toBe(0);
    });

    it('handles 100% reach', async () => {
      (prisma.scheduledReminder.count as jest.Mock)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(80);

      const result = await getKPI('reminderReach');

      expect(result.value).toBe(100);
    });
  });

  describe('Escalation SLA Closure', () => {
    it('calculates percentage of resolved escalations', async () => {
      (prisma.escalation.count as jest.Mock)
        .mockResolvedValueOnce(40) // total
        .mockResolvedValueOnce(30); // resolved

      const result = await getKPI('escalationSlaClosure');

      expect(result.value).toBe(75);
      expect(result.unit).toBe('percentage');
      expect(result.label).toBe('Escalation SLA Closure');
    });

    it('returns 0% when no escalations exist', async () => {
      (prisma.escalation.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('escalationSlaClosure');

      expect(result.value).toBe(0);
    });

    it('handles 100% closure', async () => {
      (prisma.escalation.count as jest.Mock)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(25);

      const result = await getKPI('escalationSlaClosure');

      expect(result.value).toBe(100);
    });
  });

  describe('Ground Truth Accept Rate', () => {
    it('calculates percentage of accepted AI recommendations', async () => {
      (prisma.assuranceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100) // total decided
        .mockResolvedValueOnce(85); // accepted (humanOverride = false)

      const result = await getKPI('groundTruthAcceptRate');

      expect(result.value).toBe(85);
      expect(result.unit).toBe('percentage');
      expect(result.label).toBe('Ground Truth Accept Rate');
    });

    it('returns 0% when no decided events', async () => {
      (prisma.assuranceEvent.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('groundTruthAcceptRate');

      expect(result.value).toBe(0);
    });

    it('handles 100% accept rate', async () => {
      (prisma.assuranceEvent.count as jest.Mock)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(50);

      const result = await getKPI('groundTruthAcceptRate');

      expect(result.value).toBe(100);
    });
  });

  describe('Prevention Plan Completion', () => {
    it('calculates percentage of completed plans (excluding archived)', async () => {
      (prisma.preventionPlan.count as jest.Mock)
        .mockResolvedValueOnce(60) // total non-archived
        .mockResolvedValueOnce(24); // completed

      const result = await getKPI('preventionCompletion');

      expect(result.value).toBe(40);
      expect(result.unit).toBe('percentage');
      expect(result.label).toBe('Prevention Plan Completion');
    });

    it('returns 0% when no non-archived plans exist', async () => {
      (prisma.preventionPlan.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('preventionCompletion');

      expect(result.value).toBe(0);
    });

    it('handles 100% completion', async () => {
      (prisma.preventionPlan.count as jest.Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);

      const result = await getKPI('preventionCompletion');

      expect(result.value).toBe(100);
    });
  });

  // ========================================================================
  // BATCH + ERROR
  // ========================================================================

  describe('getAllKPIs', () => {
    it('fetches all 8 KPIs in parallel', async () => {
      // Governance KPIs
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100)  // totalEvaluations
        .mockResolvedValueOnce(100)  // blockRate - total
        .mockResolvedValueOnce(5)    // blockRate - blocks
        .mockResolvedValueOnce(50)   // overrideRate - total at risk
        .mockResolvedValueOnce(5)    // overrideRate - overrides
        .mockResolvedValueOnce(100)  // attestationCompliance - total required
        .mockResolvedValueOnce(95);  // attestationCompliance - submitted

      // Reminder Reach
      (prisma.scheduledReminder.count as jest.Mock)
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(150);

      // Escalation SLA Closure
      (prisma.escalation.count as jest.Mock)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(30);

      // Ground Truth Accept Rate
      (prisma.assuranceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(85);

      // Prevention Completion
      (prisma.preventionPlan.count as jest.Mock)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(24);

      // Financial Guardrail KPIs
      (prisma.prescription.count as jest.Mock)
        .mockResolvedValueOnce(3)  // glosaInterceptCount
        .mockResolvedValueOnce(3); // tussCatchCount

      const result = await getAllKPIs({
        startDate: '2026-02-01',
        endDate: '2026-02-11',
      });

      // All 10 keys present
      expect(Object.keys(result)).toHaveLength(10);
      expect(result.totalEvaluations).toBeDefined();
      expect(result.blockRate).toBeDefined();
      expect(result.overrideRate).toBeDefined();
      expect(result.attestationCompliance).toBeDefined();
      expect(result.reminderReach).toBeDefined();
      expect(result.escalationSlaClosure).toBeDefined();
      expect(result.groundTruthAcceptRate).toBeDefined();
      expect(result.preventionCompletion).toBeDefined();
      expect(result.glosaInterceptCount).toBeDefined();
      expect(result.tussCatchCount).toBeDefined();

      expect(result.totalEvaluations.value).toBe(100);
      expect(result.blockRate.value).toBe(5);
      expect(result.reminderReach.value).toBe(75);
      expect(result.escalationSlaClosure.value).toBe(75);
      expect(result.groundTruthAcceptRate.value).toBe(85);
      expect(result.preventionCompletion.value).toBe(40);
      expect(result.glosaInterceptCount.value).toBe(3);
      expect(result.tussCatchCount.value).toBe(3);
    });
  });

  // ========================================================================
  // FINANCIAL GUARDRAIL KPIs (9-10)
  // ========================================================================

  describe('Glosa Intercept Count', () => {
    it('KPI-009: counts encounter-linked prescriptions', async () => {
      (prisma.prescription.count as jest.Mock).mockResolvedValue(3);

      const result = await getKPI('glosaInterceptCount', {});

      expect(result).toEqual({ value: 3, unit: 'count', label: 'Glosa Interceptions' });
      expect(prisma.prescription.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ encounterId: { not: null } }) })
      );
    });

    it('KPI-009: returns 0 when no encounter-linked prescriptions exist', async () => {
      (prisma.prescription.count as jest.Mock).mockResolvedValue(0);
      const result = await getKPI('glosaInterceptCount', {});
      expect(result.value).toBe(0);
    });
  });

  describe('TUSS Catch Count', () => {
    it('KPI-010: counts pending encounter-linked prescriptions with diagnosis', async () => {
      (prisma.prescription.count as jest.Mock).mockResolvedValue(2);

      const result = await getKPI('tussCatchCount', {});

      expect(result).toEqual({ value: 2, unit: 'count', label: 'TUSS Checks Run' });
      expect(prisma.prescription.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            encounterId: { not: null },
            status: 'PENDING',
            diagnosis: { not: null },
          }),
        })
      );
    });

    it('KPI-010: returns 0 when no TUSS checks have been run', async () => {
      (prisma.prescription.count as jest.Mock).mockResolvedValue(0);
      const result = await getKPI('tussCatchCount', {});
      expect(result.value).toBe(0);
    });
  });

  it('throws error for unknown KPI type', async () => {
    await expect(
      getKPI('unknownKPI' as any)
    ).rejects.toThrow('Unknown KPI type');
  });
});
