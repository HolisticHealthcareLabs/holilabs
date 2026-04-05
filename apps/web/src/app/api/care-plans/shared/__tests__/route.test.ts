import { NextRequest } from 'next/server';

// --- Mock setup (MUST come before require) ---

jest.mock('@/lib/prisma', () => ({
  prisma: {
    careTeam: { findUnique: jest.fn() },
    sharedCarePlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    careGoal: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    vBCOutcomeRecord: {
      create: jest.fn(),
    },
    sharedCareRecord: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  __esModule: true,
  safeErrorResponse: jest.fn((_error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: 500 },
    );
  }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// --- Require handlers AFTER mocks ---

const { prisma } = require('@/lib/prisma');
const { GET: listPlans, POST: createPlan } = require('../route');
const { GET: getPlan, PATCH: updatePlan } = require('../[id]/route');
const { POST: createGoal } = require('../[id]/goals/route');
const { PATCH: updateGoal } = require('../[id]/goals/[goalId]/route');
const { POST: recordOutcome } = require('../[id]/outcomes/route');
const { POST: reportConflict } = require('../[id]/conflicts/route');

// --- Helpers ---

function buildRequest(url: string, opts?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), opts as any);
}

const mockUser = {
  id: 'user-1',
  email: 'dr@holilabs.com',
  role: 'CLINICIAN',
  organizationId: 'org-1',
};

const baseContext = { user: mockUser, params: {} };

// --- Tests ---

describe('Shared Care Plans API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================================================================
  // POST /care-plans/shared
  // ================================================================
  describe('POST /care-plans/shared', () => {
    const validBody = {
      careTeamId: 'ct-1',
      patientId: 'pat-1',
      title: 'Cardiac Rehab Plan',
      discipline: 'Cardiology',
      description: 'Post-MI rehabilitation plan',
      reviewCycleDays: 14,
    };

    it('creates a shared care plan with valid body', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
        id: 'ct-1',
        patientId: 'pat-1',
        status: 'ACTIVE',
      });

      const mockPlan = { id: 'plan-1', ...validBody, status: 'DRAFT', goals: [] };
      (prisma.sharedCarePlan.create as jest.Mock).mockResolvedValue(mockPlan);

      const req = buildRequest('http://localhost:3000/api/care-plans/shared', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createPlan(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.id).toBe('plan-1');
      expect(json.data.status).toBe('DRAFT');
      expect(prisma.sharedCarePlan.create).toHaveBeenCalledTimes(1);
    });

    it('returns 422 when required fields are missing', async () => {
      const req = buildRequest('http://localhost:3000/api/care-plans/shared', {
        method: 'POST',
        body: JSON.stringify({ careTeamId: 'ct-1' }),
      });

      const res = await createPlan(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.error).toBe('Validation error');
    });

    it('returns 404 when care team does not exist', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue(null);

      const req = buildRequest('http://localhost:3000/api/care-plans/shared', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createPlan(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Care team not found');
    });

    it('returns 409 when care team is not ACTIVE', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
        id: 'ct-1',
        patientId: 'pat-1',
        status: 'SUSPENDED',
      });

      const req = buildRequest('http://localhost:3000/api/care-plans/shared', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createPlan(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('SUSPENDED');
    });

    it('returns 400 when patient does not belong to care team', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
        id: 'ct-1',
        patientId: 'different-patient',
        status: 'ACTIVE',
      });

      const req = buildRequest('http://localhost:3000/api/care-plans/shared', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createPlan(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('does not belong');
    });
  });

  // ================================================================
  // GET /care-plans/shared
  // ================================================================
  describe('GET /care-plans/shared', () => {
    it('lists plans with pagination', async () => {
      const mockPlans = [
        { id: 'plan-1', title: 'Plan A', goals: [], _count: { sharedRecords: 3 } },
      ];
      (prisma.sharedCarePlan.findMany as jest.Mock).mockResolvedValue(mockPlans);
      (prisma.sharedCarePlan.count as jest.Mock).mockResolvedValue(1);

      const req = buildRequest('http://localhost:3000/api/care-plans/shared');
      const res = await listPlans(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.pagination.total).toBe(1);
    });

    it('filters by careTeamId query param', async () => {
      (prisma.sharedCarePlan.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sharedCarePlan.count as jest.Mock).mockResolvedValue(0);

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared?careTeamId=ct-5',
      );
      await listPlans(req, { ...baseContext });

      const findManyCall = (prisma.sharedCarePlan.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.careTeamId).toBe('ct-5');
    });
  });

  // ================================================================
  // GET /care-plans/shared/[id]
  // ================================================================
  describe('GET /care-plans/shared/[id]', () => {
    it('returns plan detail with goals and care team', async () => {
      const mockPlan = {
        id: 'plan-1',
        title: 'Cardiac Rehab',
        goals: [{ id: 'goal-1', title: 'Walk 30 min/day' }],
        sharedRecords: [],
        careTeam: { id: 'ct-1', members: [{ id: 'm-1', isActive: true }] },
      };
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

      const req = buildRequest('http://localhost:3000/api/care-plans/shared/plan-1');
      const res = await getPlan(req, { ...baseContext, params: { id: 'plan-1' } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.goals).toHaveLength(1);
      expect(json.data.careTeam.members).toHaveLength(1);
    });

    it('returns 404 when plan not found', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue(null);

      const req = buildRequest('http://localhost:3000/api/care-plans/shared/missing');
      const res = await getPlan(req, { ...baseContext, params: { id: 'missing' } });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Shared care plan not found');
    });
  });

  // ================================================================
  // PATCH /care-plans/shared/[id]
  // ================================================================
  describe('PATCH /care-plans/shared/[id]', () => {
    it('updates plan status to ACTIVE and sets lastReviewedAt', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        status: 'DRAFT',
      });
      (prisma.sharedCarePlan.update as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        status: 'ACTIVE',
        goals: [],
      });

      const req = buildRequest('http://localhost:3000/api/care-plans/shared/plan-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      const res = await updatePlan(req, { ...baseContext, params: { id: 'plan-1' } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('ACTIVE');

      const updateCall = (prisma.sharedCarePlan.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.lastReviewedAt).toBeInstanceOf(Date);
    });

    it('returns 404 when plan does not exist', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue(null);

      const req = buildRequest('http://localhost:3000/api/care-plans/shared/missing', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New title' }),
      });

      const res = await updatePlan(req, { ...baseContext, params: { id: 'missing' } });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Shared care plan not found');
    });
  });

  // ================================================================
  // POST /care-plans/shared/[id]/goals
  // ================================================================
  describe('POST /care-plans/shared/[id]/goals', () => {
    it('creates a care goal on an active plan', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        careTeamId: 'ct-1',
        status: 'ACTIVE',
      });

      const mockGoal = {
        id: 'goal-1',
        title: 'Walk 30 min/day',
        status: 'PROPOSED',
        measureCode: 'LOINC-55423-8',
      };
      (prisma.careGoal.create as jest.Mock).mockResolvedValue(mockGoal);

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/goals',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Walk 30 min/day',
            priority: 'HIGH',
            measureCode: 'LOINC-55423-8',
            measureName: 'Walking duration',
            targetValue: 30,
            targetUnit: 'min',
          }),
        },
      );

      const res = await createGoal(req, { ...baseContext, params: { id: 'plan-1' } });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.status).toBe('PROPOSED');
      expect(json.data.measureCode).toBe('LOINC-55423-8');
    });

    it('returns 409 when plan is CANCELLED', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        careTeamId: 'ct-1',
        status: 'CANCELLED',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/goals',
        {
          method: 'POST',
          body: JSON.stringify({ title: 'Unreachable goal', priority: 'LOW' }),
        },
      );

      const res = await createGoal(req, { ...baseContext, params: { id: 'plan-1' } });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('CANCELLED');
    });

    it('returns 422 when title is missing', async () => {
      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/goals',
        {
          method: 'POST',
          body: JSON.stringify({ priority: 'HIGH' }),
        },
      );

      const res = await createGoal(req, { ...baseContext, params: { id: 'plan-1' } });

      expect(res.status).toBe(422);
    });
  });

  // ================================================================
  // PATCH /care-plans/shared/[id]/goals/[goalId]
  // ================================================================
  describe('PATCH /care-plans/shared/[id]/goals/[goalId]', () => {
    it('updates goal status from PROPOSED to ACCEPTED', async () => {
      (prisma.careGoal.findFirst as jest.Mock).mockResolvedValue({
        id: 'goal-1',
        sharedPlanId: 'plan-1',
        status: 'PROPOSED',
      });
      (prisma.careGoal.update as jest.Mock).mockResolvedValue({
        id: 'goal-1',
        status: 'ACCEPTED',
        acceptedBy: 'user-1',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/goals/goal-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACCEPTED' }),
        },
      );

      const res = await updateGoal(req, {
        ...baseContext,
        params: { id: 'plan-1', goalId: 'goal-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('ACCEPTED');

      const updateCall = (prisma.careGoal.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.acceptedBy).toBe('user-1');
    });

    it('sets achievedDate when status is ACHIEVED', async () => {
      (prisma.careGoal.findFirst as jest.Mock).mockResolvedValue({
        id: 'goal-1',
        sharedPlanId: 'plan-1',
        status: 'IN_PROGRESS',
      });
      (prisma.careGoal.update as jest.Mock).mockResolvedValue({
        id: 'goal-1',
        status: 'ACHIEVED',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/goals/goal-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACHIEVED' }),
        },
      );

      await updateGoal(req, {
        ...baseContext,
        params: { id: 'plan-1', goalId: 'goal-1' },
      });

      const updateCall = (prisma.careGoal.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.achievedDate).toBeInstanceOf(Date);
      expect(updateCall.data.achievedBy).toBe('user-1');
    });

    it('returns 404 when goal not found in plan', async () => {
      (prisma.careGoal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/goals/missing',
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACCEPTED' }),
        },
      );

      const res = await updateGoal(req, {
        ...baseContext,
        params: { id: 'plan-1', goalId: 'missing' },
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Goal not found');
    });
  });

  // ================================================================
  // POST /care-plans/shared/[id]/outcomes
  // ================================================================
  describe('POST /care-plans/shared/[id]/outcomes', () => {
    it('records a clinical outcome measurement', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        status: 'ACTIVE',
      });

      const mockOutcome = {
        id: 'out-1',
        outcomeType: 'CLINICAL_MEASURE',
        measureName: 'HbA1c',
        value: 6.8,
        unit: '%',
      };
      (prisma.vBCOutcomeRecord.create as jest.Mock).mockResolvedValue(mockOutcome);

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/outcomes',
        {
          method: 'POST',
          body: JSON.stringify({
            outcomeType: 'CLINICAL_MEASURE',
            measureName: 'HbA1c',
            value: 6.8,
            unit: '%',
          }),
        },
      );

      const res = await recordOutcome(req, {
        ...baseContext,
        params: { id: 'plan-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.outcomeType).toBe('CLINICAL_MEASURE');
      expect(json.data.value).toBe(6.8);
    });

    it('returns 409 when plan is CANCELLED', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        status: 'CANCELLED',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/outcomes',
        {
          method: 'POST',
          body: JSON.stringify({
            outcomeType: 'PATIENT_REPORTED',
            measureName: 'Pain level',
            value: 3,
          }),
        },
      );

      const res = await recordOutcome(req, {
        ...baseContext,
        params: { id: 'plan-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('cancelled');
    });

    it('returns 404 when referenced goalId does not belong to plan', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        status: 'ACTIVE',
      });
      (prisma.careGoal.findFirst as jest.Mock).mockResolvedValue(null);

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/outcomes',
        {
          method: 'POST',
          body: JSON.stringify({
            goalId: 'nonexistent-goal',
            outcomeType: 'CLINICAL_MEASURE',
            measureName: 'BP Systolic',
            value: 120,
          }),
        },
      );

      const res = await recordOutcome(req, {
        ...baseContext,
        params: { id: 'plan-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Goal not found');
    });
  });

  // ================================================================
  // POST /care-plans/shared/[id]/conflicts
  // ================================================================
  describe('POST /care-plans/shared/[id]/conflicts', () => {
    it('creates a shared care record for a conflict report', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        careTeam: {
          id: 'ct-1',
          owningOrgId: 'org-1',
          sharingAgreementId: 'sa-1',
        },
      });

      const mockRecord = {
        id: 'rec-1',
        recordType: 'TASK_UPDATE',
        scope: 'MEDICATIONS',
        title: 'Metformin conflict',
      };
      (prisma.sharedCareRecord.create as jest.Mock).mockResolvedValue(mockRecord);

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/conflicts',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Metformin conflict',
            content: 'Conflicting dosage between endocrinology and cardiology teams',
            scope: 'MEDICATIONS',
          }),
        },
      );

      const res = await reportConflict(req, {
        ...baseContext,
        params: { id: 'plan-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.scope).toBe('MEDICATIONS');
      expect(prisma.sharedCareRecord.create).toHaveBeenCalledTimes(1);
    });

    it('returns 409 when care team has no sharing agreement', async () => {
      (prisma.sharedCarePlan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-1',
        patientId: 'pat-1',
        careTeam: {
          id: 'ct-1',
          owningOrgId: 'org-1',
          sharingAgreementId: null,
        },
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/conflicts',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Some conflict',
            content: 'Details here',
            scope: 'DIAGNOSES',
          }),
        },
      );

      const res = await reportConflict(req, {
        ...baseContext,
        params: { id: 'plan-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('sharing agreement');
    });

    it('returns 422 with invalid scope value', async () => {
      const req = buildRequest(
        'http://localhost:3000/api/care-plans/shared/plan-1/conflicts',
        {
          method: 'POST',
          body: JSON.stringify({
            title: 'Bad scope',
            content: 'Content',
            scope: 'INVALID_SCOPE',
          }),
        },
      );

      const res = await reportConflict(req, {
        ...baseContext,
        params: { id: 'plan-1' },
      });

      expect(res.status).toBe(422);
    });
  });
});
