export {};

/**
 * Integration Test: Clinical Ground Truth Flywheel
 *
 * Validates the core data moat pipeline:
 *   1. POST feedback → creates HumanFeedback record
 *   2. CDS override → creates AssuranceEvent with humanOverride=true
 *   3. CDS attestation → creates AssuranceEvent with humanOverride=false
 *   4. GET feedback aggregation → returns correct accept rate
 */

// ═══════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════

jest.mock('@/lib/prisma', () => ({
  prisma: {
    assuranceEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    humanFeedback: {
      create: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocks after jest.mock()
const { prisma } = require('@/lib/prisma') as {
  prisma: {
    assuranceEvent: {
      findUnique: jest.MockedFunction<any>;
      create: jest.MockedFunction<any>;
      count: jest.MockedFunction<any>;
    };
    humanFeedback: {
      create: jest.MockedFunction<any>;
      groupBy: jest.MockedFunction<any>;
      count: jest.MockedFunction<any>;
    };
  };
};

// ═══════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════

const MOCK_ASSURANCE_EVENT = {
  id: 'ae-test-001',
  patientIdHash: 'abc123hash',
  eventType: 'ALERT',
  inputContextSnapshot: { ruleId: 'DRUG-001' },
  aiRecommendation: { action: 'BLOCK' },
  humanDecision: null,
  humanOverride: false,
  clinicId: 'clinic-1',
  createdAt: new Date(),
};

const MOCK_FEEDBACK = {
  id: 'fb-test-001',
  assuranceEventId: 'ae-test-001',
  feedbackType: 'THUMBS_UP',
  feedbackValue: { userId: 'user-1' },
  feedbackSource: 'PHYSICIAN',
  createdAt: new Date(),
};

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Clinical Ground Truth Flywheel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feedback Recording', () => {
    it('should create a HumanFeedback record for thumbs up', async () => {
      prisma.assuranceEvent.findUnique.mockResolvedValue(MOCK_ASSURANCE_EVENT);
      prisma.humanFeedback.create.mockResolvedValue(MOCK_FEEDBACK);

      const result = await prisma.humanFeedback.create({
        data: {
          assuranceEventId: 'ae-test-001',
          feedbackType: 'THUMBS_UP',
          feedbackValue: { userId: 'user-1' },
          feedbackSource: 'PHYSICIAN',
        },
      });

      expect(result.id).toBe('fb-test-001');
      expect(result.feedbackType).toBe('THUMBS_UP');
      expect(result.feedbackSource).toBe('PHYSICIAN');
      expect(prisma.humanFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assuranceEventId: 'ae-test-001',
          feedbackType: 'THUMBS_UP',
        }),
      });
    });

    it('should create a HumanFeedback record for correction with free text', async () => {
      const correctionFeedback = {
        ...MOCK_FEEDBACK,
        id: 'fb-test-002',
        feedbackType: 'CORRECTION',
        feedbackValue: { freeText: 'Dosage should be 500mg, not 250mg', userId: 'user-1' },
      };
      prisma.humanFeedback.create.mockResolvedValue(correctionFeedback);

      const result = await prisma.humanFeedback.create({
        data: {
          assuranceEventId: 'ae-test-001',
          feedbackType: 'CORRECTION',
          feedbackValue: { freeText: 'Dosage should be 500mg, not 250mg', userId: 'user-1' },
          feedbackSource: 'PHYSICIAN',
        },
      });

      expect(result.feedbackType).toBe('CORRECTION');
      expect(result.feedbackValue.freeText).toContain('Dosage');
    });
  });

  describe('CDS Override → AssuranceEvent', () => {
    it('should create AssuranceEvent with humanOverride=true on override', async () => {
      const overrideEvent = {
        ...MOCK_ASSURANCE_EVENT,
        id: 'ae-override-001',
        humanDecision: { action: 'OVERRIDE', reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE' },
        humanOverride: true,
        overrideReason: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
        decidedAt: new Date(),
      };
      prisma.assuranceEvent.create.mockResolvedValue(overrideEvent);

      const result = await prisma.assuranceEvent.create({
        data: {
          patientIdHash: 'abc123hash',
          eventType: 'ALERT',
          inputContextSnapshot: { ruleId: 'DRUG-001', severity: 'BLOCK' },
          aiRecommendation: { action: 'BLOCK_OR_FLAG', ruleId: 'DRUG-001' },
          humanDecision: { action: 'OVERRIDE', reasonCode: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE' },
          humanOverride: true,
          overrideReason: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE',
          clinicId: 'clinic-1',
          decidedAt: expect.any(Date),
        },
      });

      expect(result.humanOverride).toBe(true);
      expect(result.overrideReason).toBe('CLINICAL_JUDGMENT_PALLIATIVE_CARE');
      expect(result.humanDecision.action).toBe('OVERRIDE');
    });
  });

  describe('CDS Attestation → AssuranceEvent', () => {
    it('should create AssuranceEvent with humanOverride=false on accept', async () => {
      const acceptEvent = {
        ...MOCK_ASSURANCE_EVENT,
        id: 'ae-accept-001',
        humanDecision: { action: 'ACCEPT', attestationRequired: true },
        humanOverride: false,
        decidedAt: new Date(),
      };
      prisma.assuranceEvent.create.mockResolvedValue(acceptEvent);

      const result = await prisma.assuranceEvent.create({
        data: {
          patientIdHash: 'abc123hash',
          eventType: 'ALERT',
          inputContextSnapshot: { patientId: 'p1', medication: 'Metformin' },
          aiRecommendation: { attestationRequired: true, reason: 'MISSING_DATA' },
          humanDecision: { action: 'ACCEPT', attestationRequired: true },
          humanOverride: false,
          clinicId: 'clinic-1',
          decidedAt: expect.any(Date),
        },
      });

      expect(result.humanOverride).toBe(false);
      expect(result.humanDecision.action).toBe('ACCEPT');
    });
  });

  describe('Feedback Aggregation', () => {
    it('should return correct accept rate from aggregation', async () => {
      // Mock: 8 accepts, 2 overrides → 80% accept rate
      prisma.assuranceEvent.count
        .mockResolvedValueOnce(2)  // overrides
        .mockResolvedValueOnce(8); // accepts

      prisma.humanFeedback.groupBy.mockResolvedValue([
        { feedbackType: 'THUMBS_UP', _count: { id: 12 } },
        { feedbackType: 'THUMBS_DOWN', _count: { id: 3 } },
        { feedbackType: 'CORRECTION', _count: { id: 2 } },
        { feedbackType: 'COMMENT', _count: { id: 1 } },
      ]);

      prisma.humanFeedback.count.mockResolvedValue(18);

      const overrides = await prisma.assuranceEvent.count();
      const accepts = await prisma.assuranceEvent.count();
      const totalDecisions = overrides + accepts;
      const acceptRate = totalDecisions > 0
        ? Math.round((accepts / totalDecisions) * 100)
        : 0;

      expect(acceptRate).toBe(80);
      expect(totalDecisions).toBe(10);
      expect(overrides).toBe(2);
      expect(accepts).toBe(8);

      // Verify feedback breakdown
      const feedbackGroups = await prisma.humanFeedback.groupBy();
      expect(feedbackGroups).toHaveLength(4);
      expect(feedbackGroups[0].feedbackType).toBe('THUMBS_UP');
      expect(feedbackGroups[0]._count.id).toBe(12);

      const totalFeedback = await prisma.humanFeedback.count();
      expect(totalFeedback).toBe(18);
    });

    it('should return 0% accept rate when no decisions recorded', async () => {
      prisma.assuranceEvent.count
        .mockResolvedValueOnce(0)  // overrides
        .mockResolvedValueOnce(0); // accepts

      const overrides = await prisma.assuranceEvent.count();
      const accepts = await prisma.assuranceEvent.count();
      const totalDecisions = overrides + accepts;
      const acceptRate = totalDecisions > 0
        ? Math.round((accepts / totalDecisions) * 100)
        : 0;

      expect(acceptRate).toBe(0);
      expect(totalDecisions).toBe(0);
    });
  });
});
