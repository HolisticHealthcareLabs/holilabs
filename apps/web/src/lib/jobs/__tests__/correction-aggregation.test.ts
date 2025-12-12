/**
 * Correction Aggregation Job Tests
 *
 * Tests for RLHF correction aggregation background job
 */

import { CorrectionAggregationJob } from '../correction-aggregation';

// Mock transcription correction service
jest.mock('@/lib/services/transcription-correction.service', () => ({
  transcriptionCorrectionService: {
    getCorrections: jest.fn(),
    createTrainingBatch: jest.fn(),
    generateCustomVocabulary: jest.fn(),
    getAnalytics: jest.fn(),
  },
}));

const { transcriptionCorrectionService } = require('@/lib/services/transcription-correction.service');

describe('Correction Aggregation Job', () => {
  let job: CorrectionAggregationJob;

  beforeEach(() => {
    job = new CorrectionAggregationJob();
    jest.clearAllMocks();
  });

  describe('run', () => {
    const mockCorrections = [
      {
        id: 'corr-1',
        transcriptionId: 'trans-1',
        sectionType: 'subjective',
        originalText: 'Patient has no symptoms',
        correctedText: 'Patient has mild symptoms',
        errorType: 'transcription_error',
        confidence: 0.65,
        createdAt: new Date(),
      },
      {
        id: 'corr-2',
        transcriptionId: 'trans-2',
        sectionType: 'assessment',
        originalText: 'Diagnosis: flu',
        correctedText: 'Diagnosis: influenza',
        errorType: 'medical_terminology',
        confidence: 0.85,
        createdAt: new Date(),
      },
    ];

    const mockTrainingBatch = {
      id: 'batch-1',
      startDate: new Date(),
      endDate: new Date(),
      correctionsCount: 2,
    };

    const mockVocabulary = [
      { term: 'influenza', frequency: 5 },
      { term: 'symptoms', frequency: 3 },
    ];

    const mockAnalytics = {
      totalCorrections: 2,
      errorRate: 0.15,
      avgConfidence: 0.75,
    };

    it('should aggregate corrections from previous day', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue(mockVocabulary);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await job.run();

      expect(result.success).toBe(true);
      expect(result.correctionsProcessed).toBe(2);
      expect(result.trainingBatchCreated).toBe(true);
      expect(transcriptionCorrectionService.getCorrections).toHaveBeenCalled();
    });

    it('should skip when no corrections found', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue([]);

      const result = await job.run();

      expect(result.success).toBe(true);
      expect(result.correctionsProcessed).toBe(0);
      expect(result.trainingBatchCreated).toBe(false);
      expect(transcriptionCorrectionService.createTrainingBatch).not.toHaveBeenCalled();
    });

    it('should calculate error rate correctly', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue(mockVocabulary);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue({
        totalCorrections: 10,
        totalTranscriptions: 100,
        errorRate: 0.1,
        avgConfidence: 0.75,
      });

      const result = await job.run();

      expect(result.errorRate).toBe(0.1);
    });

    it('should calculate improvement percentage', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue(mockVocabulary);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue({
        totalCorrections: 10,
        errorRate: 0.1,
        previousErrorRate: 0.15,
        improvementPercentage: 33.33,
        avgConfidence: 0.75,
      });

      const result = await job.run();

      expect(result.improvementPercentage).toBeCloseTo(33.33, 1);
    });

    it('should create training batch', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue(mockVocabulary);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await job.run();

      expect(transcriptionCorrectionService.createTrainingBatch).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'es-MX'
      );
      expect(result.trainingBatchId).toBe('batch-1');
    });

    it('should generate custom vocabulary', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue(mockVocabulary);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await job.run();

      expect(transcriptionCorrectionService.generateCustomVocabulary).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(result.vocabularyTermsGenerated).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      transcriptionCorrectionService.getCorrections.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await job.run();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Database connection failed');
    });

    it('should use custom language when provided', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue(mockVocabulary);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      await job.run(undefined, undefined, 'pt-BR');

      expect(transcriptionCorrectionService.createTrainingBatch).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'pt-BR'
      );
    });
  });

  describe('run with custom date range', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const mockCorrections = [
      {
        id: 'corr-1',
        transcriptionId: 'trans-1',
        sectionType: 'subjective',
        originalText: 'Patient has no symptoms',
        correctedText: 'Patient has mild symptoms',
        errorType: 'transcription_error',
        confidence: 0.65,
        createdAt: new Date('2024-01-15'),
      },
    ];

    const mockTrainingBatch = {
      id: 'batch-1',
      startDate,
      endDate,
      correctionsCount: 1,
    };

    const mockAnalytics = {
      totalCorrections: 1,
      errorRate: 0.05,
      avgConfidence: 0.85,
    };

    it('should aggregate custom date range', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue([]);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await job.run(startDate, endDate);

      expect(transcriptionCorrectionService.getCorrections).toHaveBeenCalledWith(startDate, endDate);
      expect(result.correctionsProcessed).toBe(1);
    });

    it('should validate date parameters', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue([]);

      await expect(job.run(endDate, startDate)).rejects.toThrow(); // End before start
    });

    it('should handle invalid dates', async () => {
      await expect(job.run(new Date('invalid'), endDate)).rejects.toThrow();
    });

    it('should respect date boundaries', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue([]);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      await job.run(startDate, endDate);

      const calls = transcriptionCorrectionService.getCorrections.mock.calls[0];
      expect(calls[0]).toEqual(startDate);
      expect(calls[1]).toEqual(endDate);
    });
  });

  describe('job metrics and logging', () => {
    const mockCorrections = [
      {
        id: 'corr-1',
        transcriptionId: 'trans-1',
        sectionType: 'subjective',
        originalText: 'Patient has no symptoms',
        correctedText: 'Patient has mild symptoms',
        errorType: 'transcription_error',
        confidence: 0.65,
        createdAt: new Date(),
      },
    ];

    const mockTrainingBatch = {
      id: 'batch-1',
      startDate: new Date(),
      endDate: new Date(),
      correctionsCount: 1,
    };

    const mockAnalytics = {
      totalCorrections: 1,
      errorRate: 0.05,
      avgConfidence: 0.85,
    };

    it('should return execution time', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue([]);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await job.run();

      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should return job start and end timestamps', async () => {
      transcriptionCorrectionService.getCorrections.mockResolvedValue(mockCorrections);
      transcriptionCorrectionService.createTrainingBatch.mockResolvedValue(mockTrainingBatch);
      transcriptionCorrectionService.generateCustomVocabulary.mockResolvedValue([]);
      transcriptionCorrectionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const beforeRun = new Date();
      const result = await job.run();
      const afterRun = new Date();

      expect(result.jobStartTime).toBeDefined();
      expect(result.jobEndTime).toBeDefined();
      expect(result.jobStartTime.getTime()).toBeGreaterThanOrEqual(beforeRun.getTime());
      expect(result.jobEndTime.getTime()).toBeLessThanOrEqual(afterRun.getTime());
    });
  });
});
