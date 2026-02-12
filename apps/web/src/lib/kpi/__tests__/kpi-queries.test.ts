/**
 * KPI Queries Tests
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    governanceEvent: {
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
      // Set up mocks: first call returns total (100), second returns blocks (5)
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // blocks

      const result = await getKPI('blockRate', {
        startDate: '2026-02-01',
        endDate: '2026-02-11',
      });

      expect(result.value).toBe(5);
      expect(result.unit).toBe('percentage');
      expect(result.label).toBe('Block Rate');
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(100);
    });

    it('returns 0% when no evaluations', async () => {
      (prisma.governanceEvent.count as jest.Mock).mockResolvedValueOnce(0);

      const result = await getKPI('blockRate');

      expect(result.value).toBe(0);
      expect(result.unit).toBe('percentage');
    });

    it('handles 100% block rate', async () => {
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(50); // blocks

      const result = await getKPI('blockRate');

      expect(result.value).toBe(100);
    });
  });

  describe('Override Rate', () => {
    it('calculates override rate from blocked/flagged items', async () => {
      // Total at risk (HARD_BLOCK + SOFT_NUDGE)
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(50) // total at risk
        .mockResolvedValueOnce(5); // overrides

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
      // Total SOFT_NUDGE (required)
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100) // total required
        .mockResolvedValueOnce(95); // submitted

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

  describe('getAllKPIs', () => {
    it('fetches all 4 KPIs in parallel', async () => {
      (prisma.governanceEvent.count as jest.Mock)
        .mockResolvedValueOnce(100) // totalEvaluations
        .mockResolvedValueOnce(100) // blockRate - total
        .mockResolvedValueOnce(5) // blockRate - blocks
        .mockResolvedValueOnce(50) // overrideRate - total at risk
        .mockResolvedValueOnce(5) // overrideRate - overrides
        .mockResolvedValueOnce(100) // attestationCompliance - total required
        .mockResolvedValueOnce(95); // attestationCompliance - submitted

      const result = await getAllKPIs({
        startDate: '2026-02-01',
        endDate: '2026-02-11',
      });

      expect(result.totalEvaluations).toBeDefined();
      expect(result.blockRate).toBeDefined();
      expect(result.overrideRate).toBeDefined();
      expect(result.attestationCompliance).toBeDefined();

      expect(result.totalEvaluations.value).toBe(100);
      expect(result.blockRate.value).toBe(5);
    });
  });

  it('throws error for unknown KPI type', async () => {
    await expect(
      getKPI('unknownKPI' as any)
    ).rejects.toThrow('Unknown KPI type');
  });
});
