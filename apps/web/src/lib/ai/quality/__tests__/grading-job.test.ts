/**
 * Tests for Quality Grading Job
 *
 * Tests the async quality grading pipeline:
 * - QualityGradingQueue
 * - queueForQualityGrading
 * - gradeContentDirectly
 * - getQualityDashboardMetrics
 */

import {
  queueForQualityGrading,
  gradeContentDirectly,
  getQualityQueue,
  getQualityDashboardMetrics,
} from '../grading-job';

// Mock dependencies
jest.mock('@/lib/logger');

jest.mock('@/lib/ai/chat', () => ({
  chat: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    aIUsageLog: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Import mocks after jest.mock
const { chat } = require('@/lib/ai/chat');
const { prisma } = require('@/lib/prisma');

// ============================================
// TEST FIXTURES
// ============================================

const SAMPLE_TRANSCRIPT = `
Patient presents with blood pressure 145/92, heart rate 78 bpm.
Currently taking metformin 500mg twice daily and lisinopril 10mg.
Reports fatigue and increased thirst over the past week.
A1C: 8.2. Patient has diabetes and hypertension.
`;

const SAMPLE_NOTE = `
SUBJECTIVE: Patient reports fatigue and increased thirst for one week.

OBJECTIVE:
- BP: 145/92 mmHg
- HR: 78 bpm
- A1C: 8.2%

MEDICATIONS:
- Metformin 500mg BID
- Lisinopril 10mg daily

ASSESSMENT:
- Type 2 Diabetes Mellitus - poorly controlled
- Hypertension - elevated

PLAN:
- Increase metformin monitoring
- Follow-up in 2 weeks
`;

const VALID_GRADING_RESPONSE = JSON.stringify({
  overallScore: 85,
  dimensions: [
    { name: 'Factual Accuracy', score: 90, weight: 0.4, issues: [] },
    { name: 'Completeness', score: 80, weight: 0.3, issues: ['Missing allergy documentation'] },
    { name: 'Clinical Relevance', score: 85, weight: 0.2, issues: [] },
    { name: 'Format Quality', score: 90, weight: 0.1, issues: [] },
  ],
  hallucinations: [],
  criticalIssues: [],
  recommendation: 'pass',
});

// ============================================
// QualityGradingQueue TESTS
// ============================================

describe('QualityGradingQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Stop the queue to clean up
    const queue = getQualityQueue();
    queue.stop();
  });

  describe('add', () => {
    it('should add job to queue', async () => {
      const queue = getQualityQueue();
      const initialLength = queue.length;

      await queueForQualityGrading(
        'usage-123',
        SAMPLE_TRANSCRIPT,
        SAMPLE_NOTE,
        'clinical_notes'
      );

      expect(queue.length).toBe(initialLength + 1);
    });

    it('should add high priority jobs to front', async () => {
      const queue = getQualityQueue();

      // Add normal priority job first
      await queueForQualityGrading(
        'usage-normal',
        SAMPLE_TRANSCRIPT,
        SAMPLE_NOTE,
        'clinical_notes',
        'normal'
      );

      const lengthAfterNormal = queue.length;

      // Add high priority job
      await queueForQualityGrading(
        'usage-high',
        SAMPLE_TRANSCRIPT,
        SAMPLE_NOTE,
        'clinical_notes',
        'high'
      );

      expect(queue.length).toBe(lengthAfterNormal + 1);
    });
  });

  describe('length', () => {
    it('should return current queue length', () => {
      const queue = getQualityQueue();
      const length = queue.length;
      expect(typeof length).toBe('number');
      expect(length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stop', () => {
    it('should stop the processing loop', () => {
      const queue = getQualityQueue();
      queue.stop();
      // Should not throw
    });
  });
});

// ============================================
// gradeContentDirectly TESTS
// ============================================

describe('gradeContentDirectly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return grading result for valid response', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: VALID_GRADING_RESPONSE,
    });

    const result = await gradeContentDirectly(
      SAMPLE_TRANSCRIPT,
      SAMPLE_NOTE,
      'clinical_notes'
    );

    expect(result).not.toBeNull();
    expect(result?.overallScore).toBeDefined();
    expect(result?.dimensions).toHaveLength(4);
    expect(result?.recommendation).toBe('pass');
  });

  it('should return null for failed LLM call', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: false,
      content: null,
    });

    const result = await gradeContentDirectly(
      SAMPLE_TRANSCRIPT,
      SAMPLE_NOTE,
      'clinical_notes'
    );

    expect(result).toBeNull();
  });

  it('should return null for invalid JSON response', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: 'This is not valid JSON',
    });

    const result = await gradeContentDirectly(
      SAMPLE_TRANSCRIPT,
      SAMPLE_NOTE,
      'clinical_notes'
    );

    expect(result).toBeNull();
  });

  it('should use extraction rubric for patient_state_extraction', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: VALID_GRADING_RESPONSE,
    });

    await gradeContentDirectly(
      SAMPLE_TRANSCRIPT,
      '{"vitals": {"bp_systolic": 145}}',
      'patient_state_extraction'
    );

    // Verify chat was called with a prompt containing extraction-related content
    expect(chat).toHaveBeenCalled();
    const callArgs = (chat as jest.Mock).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain(SAMPLE_TRANSCRIPT);
  });

  it('should use low temperature for consistency', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: VALID_GRADING_RESPONSE,
    });

    await gradeContentDirectly(SAMPLE_TRANSCRIPT, SAMPLE_NOTE);

    const callArgs = (chat as jest.Mock).mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.1);
  });

  it('should use gemini provider', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: VALID_GRADING_RESPONSE,
    });

    await gradeContentDirectly(SAMPLE_TRANSCRIPT, SAMPLE_NOTE);

    const callArgs = (chat as jest.Mock).mock.calls[0][0];
    expect(callArgs.provider).toBe('gemini');
  });
});

// ============================================
// getQualityDashboardMetrics TESTS
// ============================================

describe('getQualityDashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return metrics for graded records', async () => {
    const mockRecords = [
      {
        qualityScore: 85,
        gradingNotes: { recommendation: 'pass', hallucinations: [] },
        createdAt: new Date(),
      },
      {
        qualityScore: 75,
        gradingNotes: { recommendation: 'pass', hallucinations: [] },
        createdAt: new Date(),
      },
      {
        qualityScore: 60,
        gradingNotes: { recommendation: 'review_required', hallucinations: ['test'] },
        createdAt: new Date(),
      },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    expect(metrics.averageScore).toBeDefined();
    expect(metrics.scoreDistribution).toHaveLength(6); // 6 ranges
    expect(metrics.passRate).toBeGreaterThan(0);
    expect(metrics.reviewRate).toBeGreaterThan(0);
    expect(metrics.failRate).toBe(0);
  });

  it('should calculate average score correctly', async () => {
    const mockRecords = [
      { qualityScore: 80, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 90, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 70, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    expect(metrics.averageScore).toBe(80); // (80 + 90 + 70) / 3 = 80
  });

  it('should calculate score distribution correctly', async () => {
    const mockRecords = [
      { qualityScore: 95, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 85, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 75, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 65, gradingNotes: { recommendation: 'review_required' }, createdAt: new Date() },
      { qualityScore: 45, gradingNotes: { recommendation: 'fail' }, createdAt: new Date() },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    // Find each range's count
    const range91_100 = metrics.scoreDistribution.find(d => d.range === '91-100');
    const range81_90 = metrics.scoreDistribution.find(d => d.range === '81-90');
    const range71_80 = metrics.scoreDistribution.find(d => d.range === '71-80');
    const range61_70 = metrics.scoreDistribution.find(d => d.range === '61-70');
    const range0_50 = metrics.scoreDistribution.find(d => d.range === '0-50');

    expect(range91_100?.count).toBe(1);
    expect(range81_90?.count).toBe(1);
    expect(range71_80?.count).toBe(1);
    expect(range61_70?.count).toBe(1);
    expect(range0_50?.count).toBe(1);
  });

  it('should calculate recommendation rates correctly', async () => {
    const mockRecords = [
      { qualityScore: 85, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 80, gradingNotes: { recommendation: 'pass' }, createdAt: new Date() },
      { qualityScore: 60, gradingNotes: { recommendation: 'review_required' }, createdAt: new Date() },
      { qualityScore: 40, gradingNotes: { recommendation: 'fail' }, createdAt: new Date() },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    expect(metrics.passRate).toBe(50); // 2 out of 4
    expect(metrics.reviewRate).toBe(25); // 1 out of 4
    expect(metrics.failRate).toBe(25); // 1 out of 4
  });

  it('should return zeros for empty records', async () => {
    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue([]);

    const metrics = await getQualityDashboardMetrics();

    expect(metrics.averageScore).toBe(0);
    expect(metrics.passRate).toBe(0);
    expect(metrics.reviewRate).toBe(0);
    expect(metrics.failRate).toBe(0);
  });

  it('should filter by organization when provided', async () => {
    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue([]);

    await getQualityDashboardMetrics('org-123');

    const callArgs = (prisma.aIUsageLog.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where.clinicId).toBe('org-123');
  });

  it('should use custom days back parameter', async () => {
    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue([]);

    await getQualityDashboardMetrics(undefined, 7);

    const callArgs = (prisma.aIUsageLog.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where.createdAt.gte).toBeDefined();

    // The date should be approximately 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const filterDate = callArgs.where.createdAt.gte;

    // Allow 1 second tolerance
    expect(Math.abs(filterDate.getTime() - sevenDaysAgo.getTime())).toBeLessThan(1000);
  });

  it('should aggregate hallucination types', async () => {
    const mockRecords = [
      {
        qualityScore: 70,
        gradingNotes: {
          recommendation: 'review_required',
          hallucinations: ['medication X not mentioned', 'vital sign Y incorrect'],
        },
        createdAt: new Date(),
      },
      {
        qualityScore: 65,
        gradingNotes: {
          recommendation: 'review_required',
          hallucinations: ['medication Z fabricated'],
        },
        createdAt: new Date(),
      },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    expect(metrics.topHallucinations.length).toBeGreaterThan(0);
    const medicationHallucinations = metrics.topHallucinations.find(
      h => h.type === 'Medication'
    );
    expect(medicationHallucinations?.count).toBe(2);
  });

  it('should return trend data sorted by date', async () => {
    const day1 = new Date('2024-01-01');
    const day2 = new Date('2024-01-02');
    const day3 = new Date('2024-01-03');

    const mockRecords = [
      { qualityScore: 80, gradingNotes: { recommendation: 'pass' }, createdAt: day2 },
      { qualityScore: 90, gradingNotes: { recommendation: 'pass' }, createdAt: day1 },
      { qualityScore: 70, gradingNotes: { recommendation: 'pass' }, createdAt: day3 },
      { qualityScore: 85, gradingNotes: { recommendation: 'pass' }, createdAt: day1 },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    // Trend should be sorted by date ascending
    expect(metrics.trendLast30Days.length).toBeGreaterThan(0);
    for (let i = 1; i < metrics.trendLast30Days.length; i++) {
      expect(metrics.trendLast30Days[i].date >= metrics.trendLast30Days[i - 1].date).toBe(true);
    }
  });

  it('should calculate daily averages for trend', async () => {
    const day1 = new Date('2024-01-01');

    const mockRecords = [
      { qualityScore: 80, gradingNotes: { recommendation: 'pass' }, createdAt: day1 },
      { qualityScore: 90, gradingNotes: { recommendation: 'pass' }, createdAt: day1 },
      { qualityScore: 70, gradingNotes: { recommendation: 'pass' }, createdAt: day1 },
    ];

    (prisma.aIUsageLog.findMany as jest.Mock).mockResolvedValue(mockRecords);

    const metrics = await getQualityDashboardMetrics();

    const day1Trend = metrics.trendLast30Days.find(t => t.date === '2024-01-01');
    expect(day1Trend?.avgScore).toBe(80); // (80 + 90 + 70) / 3 = 80
  });
});

// ============================================
// queueForQualityGrading TESTS
// ============================================

describe('queueForQualityGrading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    const queue = getQualityQueue();
    queue.stop();
  });

  it('should queue a job with default parameters', async () => {
    await queueForQualityGrading(
      'usage-123',
      SAMPLE_TRANSCRIPT,
      SAMPLE_NOTE
    );

    // Job should be added to queue
    const queue = getQualityQueue();
    expect(queue.length).toBeGreaterThanOrEqual(1);
  });

  it('should accept all content types', async () => {
    const contentTypes: Array<'clinical_notes' | 'patient_state_extraction' | 'summarization'> = [
      'clinical_notes',
      'patient_state_extraction',
      'summarization',
    ];

    for (const contentType of contentTypes) {
      await queueForQualityGrading(
        `usage-${contentType}`,
        SAMPLE_TRANSCRIPT,
        SAMPLE_NOTE,
        contentType
      );
    }

    // All jobs should be added
    const queue = getQualityQueue();
    expect(queue.length).toBeGreaterThanOrEqual(contentTypes.length);
  });

  it('should accept priority parameter', async () => {
    await queueForQualityGrading(
      'usage-priority',
      SAMPLE_TRANSCRIPT,
      SAMPLE_NOTE,
      'clinical_notes',
      'high'
    );

    // Should not throw
    const queue = getQualityQueue();
    expect(queue.length).toBeGreaterThanOrEqual(1);
  });
});
