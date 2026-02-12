/**
 * Override Aggregator Tests
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    governanceEvent: {
      findMany: jest.fn(),
    },
  },
}));

import { getOverrideReasons } from '../override-aggregator';
import { prisma } from '@/lib/prisma';

describe('Override Aggregator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('KPI-Override-001: Overrides ranked by count descending', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([
      { overrideReason: 'Clinical Judgment: Palliative Care' },
      { overrideReason: 'Clinical Judgment' },
      { overrideReason: 'Clinical Judgment' },
      { overrideReason: 'Patient Context' },
      { overrideReason: 'Patient Context' },
      { overrideReason: 'Patient Context' },
      { overrideReason: 'Allergy' },
      { overrideReason: 'Allergy' },
      { overrideReason: 'No Alternative' },
    ]);

    const result = await getOverrideReasons({
      startDate: '2026-02-01',
      endDate: '2026-02-11',
    });

    expect(result).toEqual(
      expect.arrayContaining([
        {
          reasonCode: expect.any(String),
          reasonLabel: expect.any(String),
          count: expect.any(Number),
          percentage: expect.any(Number),
        },
      ])
    );

    // Verify descending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].count).toBeLessThanOrEqual(result[i - 1].count);
    }
  });

  it('returns empty array when no overrides', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getOverrideReasons();

    expect(result).toEqual([]);
  });

  it('normalizes clinical judgment variants', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([
      { overrideReason: 'Clinical Judgment' },
      { overrideReason: 'Clinical Expertise' },
      { overrideReason: 'Clinical Assessment' },
    ]);

    const result = await getOverrideReasons();

    expect(result.length).toBe(1);
    expect(result[0].reasonCode).toBe('CLINICAL_JUDGMENT');
    expect(result[0].count).toBe(3);
    expect(result[0].percentage).toBe(100);
  });

  it('normalizes palliative care reasons', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([
      { overrideReason: 'Palliative Care' },
      { overrideReason: 'End-of-Life Care' },
    ]);

    const result = await getOverrideReasons();

    expect(result.length).toBe(1);
    expect(result[0].reasonCode).toBe('PALLIATIVE_CARE');
    expect(result[0].count).toBe(2);
  });

  it('calculates percentages correctly', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([
      { overrideReason: 'Clinical Judgment' },
      { overrideReason: 'Clinical Judgment' },
      { overrideReason: 'Allergy' },
      { overrideReason: 'Allergy' },
      { overrideReason: 'Allergy' },
    ]);

    const result = await getOverrideReasons();

    expect(result.length).toBe(2);
    // Find the allergy one (should be 60%)
    const allergyStat = result.find((r) => r.reasonCode === 'ALLERGY_INTOLERANCE');
    expect(allergyStat?.count).toBe(3);
    expect(allergyStat?.percentage).toBe(60);
  });

  it('handles null override reasons', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([
      { overrideReason: null },
      { overrideReason: 'Clinical Judgment' },
    ]);

    const result = await getOverrideReasons();

    // Should have 2 entries: Unknown + Clinical Judgment
    expect(result.length).toBe(2);
  });

  it('applies date range filter', async () => {
    (prisma.governanceEvent.findMany as jest.Mock).mockResolvedValue([
      { overrideReason: 'Clinical Judgment' },
    ]);

    await getOverrideReasons({
      startDate: '2026-02-01',
      endDate: '2026-02-11',
    });

    expect(prisma.governanceEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timestamp: expect.any(Object),
        }),
      })
    );
  });
});
