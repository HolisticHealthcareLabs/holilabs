import {
  analyzeTrendsByField,
  analyzeTrendsByBone,
  analyzeTrendsByMonth,
  detectRecurringPatterns,
} from '../trend-analyzer';

const mockPrisma = {
  safetyIncident: {
    groupBy: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('analyzeTrendsByField', () => {
  it('returns grouped results mapped to TrendBucket shape', async () => {
    mockPrisma.safetyIncident.groupBy.mockResolvedValue([
      { eventType: 'ADVERSE_EVENT', _count: { id: 5 } },
      { eventType: 'NEAR_MISS', _count: { id: 3 } },
    ]);

    const result = await analyzeTrendsByField(mockPrisma, 'eventType');

    expect(result).toEqual([
      { key: 'ADVERSE_EVENT', count: 5 },
      { key: 'NEAR_MISS', count: 3 },
    ]);

    expect(mockPrisma.safetyIncident.groupBy).toHaveBeenCalledWith({
      by: ['eventType'],
      where: {},
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  });

  it('applies date range filters when dateFrom and dateTo are provided', async () => {
    mockPrisma.safetyIncident.groupBy.mockResolvedValue([]);
    const dateFrom = new Date('2026-01-01');
    const dateTo = new Date('2026-03-01');

    await analyzeTrendsByField(mockPrisma, 'severity', dateFrom, dateTo);

    const callArgs = mockPrisma.safetyIncident.groupBy.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      dateOccurred: { gte: dateFrom, lte: dateTo },
    });
  });
});

describe('analyzeTrendsByBone', () => {
  it('calls raw SQL with unnest and maps bigint count to number', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { bone: 'COMMUNICATION', count: BigInt(7) },
      { bone: 'EQUIPMENT', count: BigInt(3) },
    ]);

    const result = await analyzeTrendsByBone(mockPrisma);

    expect(result).toEqual([
      { key: 'COMMUNICATION', count: 7 },
      { key: 'EQUIPMENT', count: 3 },
    ]);

    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
    expect(sql).toContain('unnest(fishbone_bones)');
    expect(sql).toContain('GROUP BY bone');
  });
});

describe('analyzeTrendsByMonth', () => {
  it('defaults to 12 months lookback and formats keys as YYYY-MM', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { month: new Date('2025-04-01'), count: BigInt(2) },
      { month: new Date('2025-05-01'), count: BigInt(4) },
    ]);

    const result = await analyzeTrendsByMonth(mockPrisma);

    expect(result).toEqual([
      { key: '2025-04', count: 2 },
      { key: '2025-05', count: 4 },
    ]);

    const cutoffParam = mockPrisma.$queryRawUnsafe.mock.calls[0][1] as Date;
    const expectedCutoff = new Date();
    expectedCutoff.setMonth(expectedCutoff.getMonth() - 12);
    expect(cutoffParam.getFullYear()).toBe(expectedCutoff.getFullYear());
    expect(cutoffParam.getMonth()).toBe(expectedCutoff.getMonth());
  });
});

describe('detectRecurringPatterns', () => {
  it('returns bones and tags exceeding threshold, sorted by count descending', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        { bone: 'COMMUNICATION', count: BigInt(5), incident_ids: ['inc-1', 'inc-2'] },
      ])
      .mockResolvedValueOnce([
        { tag: 'medication-error', count: BigInt(8), incident_ids: ['inc-3', 'inc-4', 'inc-5'] },
      ]);

    const result = await detectRecurringPatterns(mockPrisma, 3);

    expect(result).toEqual([
      {
        bone: 'medication-error',
        tag: 'medication-error',
        count: 8,
        incidentIds: ['inc-3', 'inc-4', 'inc-5'],
      },
      {
        bone: 'COMMUNICATION',
        count: 5,
        incidentIds: ['inc-1', 'inc-2'],
      },
    ]);

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    const firstSql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string;
    expect(firstSql).toContain('HAVING count(*) >= $1');
    expect(mockPrisma.$queryRawUnsafe.mock.calls[0][1]).toBe(3);
  });
});
