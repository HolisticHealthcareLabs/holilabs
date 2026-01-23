/**
 * Correction Aggregation Job Tests
 *
 * Tests for RLHF correction aggregation background job
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock prisma before imports
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transcriptionError: {
      count: jest.fn(),
    },
  },
}));

// Mock transcription correction service
jest.mock('@/lib/services/transcription-correction.service', () => ({
  transcriptionCorrectionService: {
    createTrainingBatch: jest.fn(),
    generateCustomVocabulary: jest.fn(),
    getAnalytics: jest.fn(),
    exportCorrectionsAsJSON: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocks
const { prisma } = require('@/lib/prisma');
const { transcriptionCorrectionService } = require('@/lib/services/transcription-correction.service');
const { aggregateDailyCorrections, aggregateCorrectionsRange } = require('../correction-aggregation');

describe('Correction Aggregation Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregateDailyCorrections', () => {
    const mockAnalytics = {
      totalCorrections: 10,
      avgConfidence: 0.85,
      avgEditDistance: 5,
      improvementTrend: [
        { week: '2024-01', errorRate: 0.15 },
        { week: '2024-02', errorRate: 0.10 },
      ],
      mostCommonErrors: ['typo', 'medical_term'],
      errorsBySpecialty: { general: 5, cardiology: 5 },
    };

    const mockVocabulary = [
      { term: 'influenza', frequency: 5 },
      { term: 'symptoms', frequency: 3 },
    ];

    const mockTrainingBatch = {
      id: 'batch-1',
      startDate: new Date(),
      endDate: new Date(),
      correctionsCount: 10,
    };

    it('should aggregate corrections from previous day', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(10);
      (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue(mockTrainingBatch);
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
      (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue('{"data":[]}');

      const result = await aggregateDailyCorrections();

      expect(result.processed).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results?.success).toBe(true);
      expect(result.results?.totalCorrections).toBe(10);
    });

    it('should skip when no corrections found', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(0);

      const result = await aggregateDailyCorrections();

      expect(result.processed).toBe(false);
      expect(result.results).toBeNull();
      expect(transcriptionCorrectionService.createTrainingBatch).not.toHaveBeenCalled();
    });

    it('should calculate error rate correctly', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue(mockTrainingBatch);
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue({
        ...mockAnalytics,
        improvementTrend: [
          { week: '2024-01', errorRate: 0.20 },
          { week: '2024-02', errorRate: 0.10 },
        ],
      });
      (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue('{}');

      const result = await aggregateDailyCorrections();

      expect(result.results?.errorRate).toBeCloseTo(0.15, 2); // Average of 0.20 and 0.10
    });

    it('should calculate improvement percentage', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue(mockTrainingBatch);
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue({
        ...mockAnalytics,
        improvementTrend: [
          { week: '2024-01', errorRate: 0.20 },
          { week: '2024-02', errorRate: 0.10 },
        ],
      });
      (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue('{}');

      const result = await aggregateDailyCorrections();

      // Improvement: (0.20 - 0.10) / 0.20 * 100 = 50%
      expect(result.results?.improvementPercentage).toBeCloseTo(50, 0);
    });

    it('should generate custom vocabulary', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue(mockTrainingBatch);
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
      (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue('{}');

      const result = await aggregateDailyCorrections();

      expect(transcriptionCorrectionService.generateCustomVocabulary).toHaveBeenCalled();
      expect(result.results?.customVocabularyTerms).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await aggregateDailyCorrections();

      expect(result.processed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('aggregateCorrectionsRange', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const mockAnalytics = {
      totalCorrections: 5,
      avgConfidence: 0.85,
      avgEditDistance: 3,
      improvementTrend: [{ week: '2024-01', errorRate: 0.05 }],
      mostCommonErrors: [],
      errorsBySpecialty: {},
    };

    const mockVocabulary = [{ term: 'test', frequency: 1 }];

    it('should aggregate custom date range', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await aggregateCorrectionsRange(startDate, endDate);

      expect(result.processed).toBe(true);
      expect(result.results?.totalCorrections).toBe(5);
    });

    it('should return not processed when no corrections', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(0);

      const result = await aggregateCorrectionsRange(startDate, endDate);

      expect(result.processed).toBe(false);
      expect(result.results).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockRejectedValue(
        new Error('Query timeout')
      );

      const result = await aggregateCorrectionsRange(startDate, endDate);

      expect(result.processed).toBe(false);
      expect(result.error).toContain('Query timeout');
    });

    it('should include date range in results', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await aggregateCorrectionsRange(startDate, endDate);

      expect(result.results?.dateRange.startDate).toBe(startDate.toISOString());
      expect(result.results?.dateRange.endDate).toBe(endDate.toISOString());
    });
  });

  describe('edge cases', () => {
    it('should handle empty improvement trend', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue({ id: 'batch-1' });
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue([]);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue({
        totalCorrections: 5,
        avgConfidence: 0.85,
        avgEditDistance: 3,
        improvementTrend: [],
        mostCommonErrors: [],
        errorsBySpecialty: {},
      });
      (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue('{}');

      const result = await aggregateDailyCorrections();

      expect(result.results?.errorRate).toBe(0);
      expect(result.results?.improvementPercentage).toBe(0);
    });

    it('should handle zero earliest error rate', async () => {
      (prisma.transcriptionError.count as jest.Mock).mockResolvedValue(5);
      (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue({ id: 'batch-1' });
      (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue([]);
      (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue({
        totalCorrections: 5,
        avgConfidence: 0.85,
        avgEditDistance: 3,
        improvementTrend: [{ week: '2024-01', errorRate: 0 }],
        mostCommonErrors: [],
        errorsBySpecialty: {},
      });
      (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue('{}');

      const result = await aggregateDailyCorrections();

      // Should not throw division by zero
      expect(result.results?.improvementPercentage).toBe(0);
    });
  });
});
