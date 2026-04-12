jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import {
  buildPatientTimeline,
  traceOutcomeFactors,
  identifyScreeningGaps,
} from '../graph/health-graph-queries';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

function makeMockPrisma() {
  return {
    healthGraphEdge: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    carePathwayInstance: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as any;
}

// ---------------------------------------------------------------------------
// buildPatientTimeline
// ---------------------------------------------------------------------------

describe('buildPatientTimeline', () => {
  it('groups edges by source into timeline entries', async () => {
    const prisma = makeMockPrisma();
    (prisma.healthGraphEdge.findMany as jest.Mock).mockResolvedValue([
      {
        sourceType: 'ENCOUNTER',
        sourceId: 'enc-1',
        targetType: 'CONDITION',
        targetId: 'cond-1',
        relationship: 'RESULTED_IN',
        effectiveFrom: new Date('2026-01-15'),
      },
      {
        sourceType: 'ENCOUNTER',
        sourceId: 'enc-1',
        targetType: 'TREATMENT',
        targetId: 'treat-1',
        relationship: 'TREATED_WITH',
        effectiveFrom: new Date('2026-01-15'),
      },
      {
        sourceType: 'SCREENING',
        sourceId: 'screen-1',
        targetType: 'CONDITION',
        targetId: 'cond-1',
        relationship: 'SCREENED_FOR',
        effectiveFrom: new Date('2026-01-10'),
      },
    ]);

    const timeline = await buildPatientTimeline(prisma, 'p-1', 't-1');

    expect(timeline).toHaveLength(2);
    const encounter = timeline.find((t) => t.sourceId === 'enc-1');
    expect(encounter).toBeDefined();
    expect(encounter!.relationships).toHaveLength(2);
  });

  it('returns empty timeline for patient with no edges', async () => {
    const prisma = makeMockPrisma();
    const timeline = await buildPatientTimeline(prisma, 'p-new', 't-1');
    expect(timeline).toEqual([]);
  });

  it('applies date range filter', async () => {
    const prisma = makeMockPrisma();
    await buildPatientTimeline(prisma, 'p-1', 't-1', {
      from: new Date('2026-01-01'),
      to: new Date('2026-03-31'),
    });

    expect(prisma.healthGraphEdge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          effectiveFrom: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// traceOutcomeFactors
// ---------------------------------------------------------------------------

describe('traceOutcomeFactors', () => {
  it('traces causal chain from outcome', async () => {
    const prisma = makeMockPrisma();
    let callCount = 0;
    (prisma.healthGraphEdge.findMany as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: edges pointing to the outcome
        return Promise.resolve([
          {
            sourceType: 'TREATMENT',
            sourceId: 'treat-1',
            targetType: 'OUTCOME',
            targetId: 'outcome-1',
            relationship: 'RESULTED_IN',
          },
        ]);
      }
      if (callCount === 2) {
        // Second call: edges pointing to the treatment
        return Promise.resolve([
          {
            sourceType: 'CONDITION',
            sourceId: 'cond-1',
            targetType: 'TREATMENT',
            targetId: 'treat-1',
            relationship: 'CAUSED_BY',
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const trace = await traceOutcomeFactors(prisma, 'p-1', 't-1', 'outcome-1');

    expect(trace.outcomeId).toBe('outcome-1');
    expect(trace.chain.length).toBeGreaterThan(0);
    expect(trace.chain[0].nodeType).toBe('TREATMENT');
    expect(trace.chain[0].relationship).toBe('RESULTED_IN');
  });

  it('handles no causal chain', async () => {
    const prisma = makeMockPrisma();
    const trace = await traceOutcomeFactors(prisma, 'p-1', 't-1', 'orphan-outcome');
    expect(trace.chain).toEqual([]);
  });

  it('respects max depth', async () => {
    const prisma = makeMockPrisma();
    // Create an infinite loop scenario — should stop at maxDepth
    (prisma.healthGraphEdge.findMany as jest.Mock).mockResolvedValue([
      {
        sourceType: 'CONDITION',
        sourceId: 'cond-loop',
        targetType: 'OUTCOME',
        targetId: 'cond-loop',
        relationship: 'CAUSED_BY',
      },
    ]);

    const trace = await traceOutcomeFactors(prisma, 'p-1', 't-1', 'cond-loop', 3);
    // Visited set prevents infinite recursion
    expect(trace.chain.length).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// identifyScreeningGaps
// ---------------------------------------------------------------------------

describe('identifyScreeningGaps', () => {
  it('identifies missing screenings from active pathways', async () => {
    const prisma = makeMockPrisma();
    (prisma.carePathwayInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'inst-1',
        enrolledAt: new Date('2026-01-01'),
        pathwayDefinition: {
          steps: [
            { stepId: 'step-1', name: 'HbA1c Screening', timeoutDays: 90 },
            { stepId: 'step-2', name: 'Treatment Start', timeoutDays: 30 },
          ],
        },
      },
    ]);
    (prisma.healthGraphEdge.findMany as jest.Mock).mockResolvedValue([]);

    const gaps = await identifyScreeningGaps(prisma, 'p-1', 't-1');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].screening).toBe('HbA1c Screening');
    expect(gaps[0].pathwayId).toBe('inst-1');
  });

  it('returns no gaps when all screenings completed', async () => {
    const prisma = makeMockPrisma();
    (prisma.carePathwayInstance.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'inst-1',
        enrolledAt: new Date('2026-01-01'),
        pathwayDefinition: {
          steps: [
            { stepId: 'step-1', name: 'HbA1c Screening', timeoutDays: 90 },
          ],
        },
      },
    ]);
    (prisma.healthGraphEdge.findMany as jest.Mock).mockResolvedValue([
      { sourceId: 'step-1' },
    ]);

    const gaps = await identifyScreeningGaps(prisma, 'p-1', 't-1');
    expect(gaps).toEqual([]);
  });
});
