jest.mock('@/lib/prisma', () => ({
  prisma: {
    patientAttribution: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    qualityMeasureResult: {
      findMany: jest.fn(),
    },
    vBCOutcomeRecord: {
      findMany: jest.fn(),
    },
    careGoal: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

import {
  getPopulationDashboard,
  getRiskDistribution,
} from '../population-health.service';

describe('population-health.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRiskDistribution', () => {
    it('counts patients by risk tier', async () => {
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([
        { riskTier: 'LOW' },
        { riskTier: 'LOW' },
        { riskTier: 'HIGH' },
        { riskTier: 'VERY_HIGH' },
        { riskTier: null },
      ]);

      const result = await getRiskDistribution(prisma, 'org-1');
      expect(result.low).toBe(2);
      expect(result.high).toBe(1);
      expect(result.veryHigh).toBe(1);
      expect(result.unclassified).toBe(1);
      expect(result.moderate).toBe(0);
    });

    it('handles empty population', async () => {
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getRiskDistribution(prisma, 'org-empty');
      expect(result.low).toBe(0);
      expect(result.unclassified).toBe(0);
    });
  });

  describe('getPopulationDashboard', () => {
    it('composes all sub-queries into dashboard', async () => {
      // Risk distribution
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([
        { riskTier: 'LOW' },
        { riskTier: 'MODERATE' },
      ]);
      (prisma.patientAttribution.count as jest.Mock).mockResolvedValue(2);

      // Quality summary
      (prisma.qualityMeasureResult.findMany as jest.Mock).mockResolvedValue([
        {
          rate: 0.85,
          meetsTarget: true,
          gapPatientIds: [],
          measure: { code: 'HBA1C', name: 'HbA1c Control', targetRate: 0.80 },
        },
        {
          rate: 0.65,
          meetsTarget: false,
          gapPatientIds: ['p-1', 'p-2'],
          measure: { code: 'BP', name: 'BP Control', targetRate: 0.75 },
        },
      ]);

      // Outcome summary
      (prisma.vBCOutcomeRecord.findMany as jest.Mock).mockResolvedValue([
        { outcomeType: 'CLINICAL_MEASURE' },
        { outcomeType: 'CLINICAL_MEASURE' },
        { outcomeType: 'PATIENT_REPORTED' },
      ]);

      // Goal progress
      (prisma.careGoal.findMany as jest.Mock).mockResolvedValue([
        { status: 'ACHIEVED', targetValue: 7.0, currentValue: 6.8 },
        { status: 'IN_PROGRESS', targetValue: 130, currentValue: 100 },
      ]);

      const result = await getPopulationDashboard(
        prisma,
        'org-1',
        new Date('2026-01-01'),
        new Date('2026-03-31'),
      );

      expect(result.totalAttributed).toBe(2);
      expect(result.riskDistribution.low).toBe(1);
      expect(result.riskDistribution.moderate).toBe(1);
      expect(result.qualitySummary.totalMeasures).toBe(2);
      expect(result.qualitySummary.meetingTarget).toBe(1);
      expect(result.qualitySummary.belowTarget).toBe(1);
      expect(result.qualitySummary.topGapMeasures).toHaveLength(1);
      expect(result.qualitySummary.topGapMeasures[0].measureCode).toBe('BP');
      expect(result.outcomeSummary.totalOutcomes).toBe(3);
      expect(result.outcomeSummary.goalsAchieved).toBe(1);
      expect(result.outcomeSummary.goalsInProgress).toBe(1);
    });

    it('handles empty data gracefully', async () => {
      (prisma.patientAttribution.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.patientAttribution.count as jest.Mock).mockResolvedValue(0);
      (prisma.qualityMeasureResult.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.vBCOutcomeRecord.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.careGoal.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getPopulationDashboard(
        prisma,
        'org-empty',
        new Date('2026-01-01'),
        new Date('2026-03-31'),
      );

      expect(result.totalAttributed).toBe(0);
      expect(result.qualitySummary.totalMeasures).toBe(0);
      expect(result.qualitySummary.averageRate).toBe(0);
      expect(result.outcomeSummary.averageGoalProgress).toBe(0);
    });
  });
});
