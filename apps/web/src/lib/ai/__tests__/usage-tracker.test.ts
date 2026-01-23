/**
 * AI Usage Tracker Tests
 *
 * Tests for database persistence, quota checking, and quality grading integration.
 */

// Mock Prisma before any imports
jest.mock('@/lib/prisma', () => ({
  prisma: {
    aIUsageLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  trackUsage,
  trackFromResponse,
  getUsageSummary,
  checkUserQuota,
  checkCostAlerts,
  calculateCost,
  compareProviderCosts,
  updateQualityGrading,
  getUsageRecord,
  getPendingGradingRecords,
  getQualityMetrics,
} from '../usage-tracker';

const { prisma } = require('@/lib/prisma');

describe('AI Usage Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cost Calculation', () => {
    it('should calculate gemini cost correctly', () => {
      // Gemini: $0.075/1M input, $0.30/1M output
      const cost = calculateCost('gemini', 1000, 1000);
      // (1000/1M * 0.075) + (1000/1M * 0.30) = 0.000075 + 0.0003 = 0.000375
      expect(cost).toBeCloseTo(0.000375, 6);
    });

    it('should calculate claude cost correctly', () => {
      // Claude: $3/1M input, $15/1M output
      const cost = calculateCost('claude', 1000, 1000);
      // (1000/1M * 3) + (1000/1M * 15) = 0.003 + 0.015 = 0.018
      expect(cost).toBeCloseTo(0.018, 6);
    });

    it('should calculate openai cost correctly', () => {
      // OpenAI: $5/1M input, $15/1M output
      const cost = calculateCost('openai', 1000, 1000);
      // (1000/1M * 5) + (1000/1M * 15) = 0.005 + 0.015 = 0.02
      expect(cost).toBeCloseTo(0.02, 6);
    });
  });

  describe('Provider Cost Comparison', () => {
    it('should return providers sorted by cost (cheapest first)', () => {
      const comparison = compareProviderCosts(10000);

      expect(comparison.length).toBe(3);
      expect(comparison[0].provider).toBe('gemini'); // Cheapest
      expect(comparison[2].provider).toBe('openai'); // Most expensive
    });

    it('should calculate correct savings percentages', () => {
      const comparison = compareProviderCosts(10000);

      const gemini = comparison.find(c => c.provider === 'gemini');
      expect(gemini?.costSavingsVsClaude).toMatch(/cheaper/);

      const claude = comparison.find(c => c.provider === 'claude');
      expect(claude?.costSavingsVsClaude).toBe('baseline');
    });
  });

  describe('Track Usage', () => {
    it('should persist usage record to database', async () => {
      const mockRecord = { id: 'usage-123' };
      (prisma.aIUsageLog.create as jest.Mock).mockResolvedValue(mockRecord);

      const recordId = await trackUsage({
        provider: 'gemini',
        userId: 'user-123',
        clinicId: 'clinic-456',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        responseTimeMs: 200,
        fromCache: false,
        queryComplexity: 'simple',
        feature: 'diagnosis',
      });

      expect(recordId).toBe('usage-123');
      expect(prisma.aIUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'gemini',
          userId: 'user-123',
          clinicId: 'clinic-456',
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
          responseTimeMs: 200,
          fromCache: false,
          queryComplexity: 'simple',
          feature: 'diagnosis',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.aIUsageLog.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const recordId = await trackUsage({
        provider: 'claude',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        responseTimeMs: 300,
        fromCache: false,
      });

      expect(recordId).toBeNull();
    });

    it('should calculate estimated cost before persisting', async () => {
      const mockRecord = { id: 'usage-456' };
      (prisma.aIUsageLog.create as jest.Mock).mockResolvedValue(mockRecord);

      await trackUsage({
        provider: 'claude',
        promptTokens: 1000,
        completionTokens: 1000,
        totalTokens: 2000,
        responseTimeMs: 500,
        fromCache: false,
      });

      expect(prisma.aIUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estimatedCost: expect.any(Number),
        }),
      });

      const call = (prisma.aIUsageLog.create as jest.Mock).mock.calls[0][0];
      expect(call.data.estimatedCost).toBeCloseTo(0.018, 4);
    });
  });

  describe('Track From Response', () => {
    it('should extract usage from ChatResponse and track', async () => {
      const mockRecord = { id: 'usage-789' };
      (prisma.aIUsageLog.create as jest.Mock).mockResolvedValue(mockRecord);

      const response = {
        success: true,
        message: 'Test response',
        provider: 'gemini' as const,
        usage: {
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300,
        },
      };

      const recordId = await trackFromResponse(response, {
        userId: 'user-999',
        responseTimeMs: 150,
        feature: 'clinical-notes',
      });

      expect(recordId).toBe('usage-789');
      expect(prisma.aIUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'gemini',
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300,
        }),
      });
    });

    it('should return null if no usage data in response', async () => {
      const response = {
        success: true,
        message: 'Cached response',
        provider: 'claude' as const,
        // No usage data
      };

      const recordId = await trackFromResponse(response, {
        responseTimeMs: 10,
      });

      expect(recordId).toBeNull();
      expect(prisma.aIUsageLog.create).not.toHaveBeenCalled();
    });
  });

  describe('Usage Summary', () => {
    it('should aggregate usage by date', async () => {
      const mockLogs = [
        {
          id: '1',
          provider: 'gemini',
          totalTokens: 100,
          estimatedCost: 0.001,
          fromCache: false,
          createdAt: new Date('2026-01-22T10:00:00Z'),
        },
        {
          id: '2',
          provider: 'claude',
          totalTokens: 200,
          estimatedCost: 0.05,
          fromCache: true,
          createdAt: new Date('2026-01-22T14:00:00Z'),
        },
        {
          id: '3',
          provider: 'gemini',
          totalTokens: 150,
          estimatedCost: 0.002,
          fromCache: false,
          createdAt: new Date('2026-01-23T10:00:00Z'),
        },
      ];

      (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const summary = await getUsageSummary(
        new Date('2026-01-22'),
        new Date('2026-01-24')
      );

      expect(summary.length).toBe(2); // 2 different days

      const day1 = summary.find(s => s.date === '2026-01-22');
      expect(day1?.totalQueries).toBe(2);
      expect(day1?.totalTokens).toBe(300);
      expect(day1?.cacheHitRate).toBe(0.5); // 1 of 2 was cached

      const day2 = summary.find(s => s.date === '2026-01-23');
      expect(day2?.totalQueries).toBe(1);
    });

    it('should filter by userId when provided', async () => {
      (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue([]);

      await getUsageSummary(
        new Date('2026-01-22'),
        new Date('2026-01-24'),
        { userId: 'user-123' }
      );

      expect(prisma.aIUsageLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-123',
        }),
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('User Quota Check', () => {
    it('should allow usage when under quota', async () => {
      (prisma.aIUsageLog.count as jest.Mock).mockResolvedValue(5);

      const result = await checkUserQuota('user-123', 'FREE');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5); // 10 - 5
      expect(result.limit).toBe(10);
    });

    it('should deny usage when quota exceeded', async () => {
      (prisma.aIUsageLog.count as jest.Mock).mockResolvedValue(10);

      const result = await checkUserQuota('user-123', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use correct quota limits per tier', async () => {
      (prisma.aIUsageLog.count as jest.Mock).mockResolvedValue(0);

      const free = await checkUserQuota('user-1', 'FREE');
      expect(free.limit).toBe(10);

      const starter = await checkUserQuota('user-2', 'STARTER');
      expect(starter.limit).toBe(50);

      const pro = await checkUserQuota('user-3', 'PRO');
      expect(pro.limit).toBe(999999);
    });

    it('should query only today\'s usage', async () => {
      (prisma.aIUsageLog.count as jest.Mock).mockResolvedValue(0);

      await checkUserQuota('user-123', 'FREE');

      expect(prisma.aIUsageLog.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });
  });

  describe('Cost Alerts', () => {
    it('should report when clinic is within budget', async () => {
      (prisma.aIUsageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { estimatedCost: 50 },
      });

      const result = await checkCostAlerts('clinic-123', 100);

      expect(result.isOverBudget).toBe(false);
      expect(result.currentSpend).toBe(50);
      expect(result.percentUsed).toBe(50);
    });

    it('should alert when clinic is over budget', async () => {
      (prisma.aIUsageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { estimatedCost: 150 },
      });

      const result = await checkCostAlerts('clinic-123', 100);

      expect(result.isOverBudget).toBe(true);
      expect(result.currentSpend).toBe(150);
      expect(result.percentUsed).toBe(150);
    });

    it('should handle null spend (no usage)', async () => {
      (prisma.aIUsageLog.aggregate as jest.Mock).mockResolvedValue({
        _sum: { estimatedCost: null },
      });

      const result = await checkCostAlerts('clinic-123');

      expect(result.isOverBudget).toBe(false);
      expect(result.currentSpend).toBe(0);
    });
  });

  describe('Quality Grading Integration', () => {
    it('should update usage record with quality grading', async () => {
      (prisma.aIUsageLog.update as jest.Mock).mockResolvedValue({ id: 'usage-123' });

      const result = await updateQualityGrading('usage-123', {
        qualityScore: 85,
        gradingNotes: {
          hallucinations: [],
          criticalIssues: [],
          recommendation: 'pass',
        },
        gradedBy: 'gemini-flash',
      });

      expect(result).toBe(true);
      expect(prisma.aIUsageLog.update).toHaveBeenCalledWith({
        where: { id: 'usage-123' },
        data: {
          qualityScore: 85,
          gradingNotes: {
            hallucinations: [],
            criticalIssues: [],
            recommendation: 'pass',
          },
          gradedAt: expect.any(Date),
          gradedBy: 'gemini-flash',
        },
      });
    });

    it('should handle grading update errors', async () => {
      (prisma.aIUsageLog.update as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await updateQualityGrading('invalid-id', {
        qualityScore: 50,
        gradingNotes: {
          hallucinations: ['Made up medication'],
          criticalIssues: ['Incorrect dosage'],
          recommendation: 'fail',
        },
        gradedBy: 'human',
      });

      expect(result).toBe(false);
    });

    it('should get pending grading records', async () => {
      const mockRecords = [
        { id: '1', qualityScore: null },
        { id: '2', qualityScore: null },
      ];
      (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

      const records = await getPendingGradingRecords(50);

      expect(prisma.aIUsageLog.findMany).toHaveBeenCalledWith({
        where: {
          qualityScore: null,
          fromCache: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(records.length).toBe(2);
    });

    it('should get usage record by ID', async () => {
      const mockRecord = { id: 'usage-123', provider: 'claude' };
      (prisma.aIUsageLog.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const record = await getUsageRecord('usage-123');

      expect(record).toEqual(mockRecord);
      expect(prisma.aIUsageLog.findUnique).toHaveBeenCalledWith({
        where: { id: 'usage-123' },
      });
    });
  });

  describe('Quality Metrics', () => {
    it('should calculate quality metrics correctly', async () => {
      const mockRecords = [
        { qualityScore: 90, gradingNotes: { recommendation: 'pass' } },
        { qualityScore: 85, gradingNotes: { recommendation: 'pass' } },
        { qualityScore: 60, gradingNotes: { recommendation: 'review_required' } },
        { qualityScore: 40, gradingNotes: { recommendation: 'fail' } },
      ];
      (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

      const metrics = await getQualityMetrics(
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(metrics.averageScore).toBeCloseTo(68.75, 2); // (90+85+60+40)/4
      expect(metrics.passRate).toBe(0.5); // 2 of 4
      expect(metrics.reviewRate).toBe(0.25); // 1 of 4
      expect(metrics.failRate).toBe(0.25); // 1 of 4
      expect(metrics.totalGraded).toBe(4);
    });

    it('should return zeros when no graded records', async () => {
      (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue([]);

      const metrics = await getQualityMetrics(
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(metrics.averageScore).toBe(0);
      expect(metrics.passRate).toBe(0);
      expect(metrics.totalGraded).toBe(0);
    });
  });
});
