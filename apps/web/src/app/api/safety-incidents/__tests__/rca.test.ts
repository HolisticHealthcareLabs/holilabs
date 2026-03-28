jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (h: any) => h,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    safetyIncident: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    safetyCorrectiveAction: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage || 'Error' },
      { status: 500 },
    );
  }),
}));

jest.mock('@/lib/rca/safety-rca', () => ({
  performRCA: jest.fn(),
  scoreActionStrength: jest.fn(),
}));

jest.mock('@/lib/rca/incident-state-machine', () => ({
  transitionIncident: jest.fn(),
  InvalidTransitionError: class extends Error {
    name = 'InvalidTransitionError';
    constructor(
      public current: string,
      public next: string,
    ) {
      super(`Invalid transition from ${current} to ${next}`);
    }
  },
}));

jest.mock('@prisma/client', () => ({
  IncidentStatus: {
    REPORTED: 'REPORTED',
    TRIAGED: 'TRIAGED',
    UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
    ACTIONS_PENDING: 'ACTIONS_PENDING',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
  },
}));

const { prisma } = require('@/lib/prisma');
const { performRCA, scoreActionStrength } = require('@/lib/rca/safety-rca');
const { transitionIncident, InvalidTransitionError } =
  require('@/lib/rca/incident-state-machine');

const { POST: executeRCA } = require('../[id]/rca/route');
const { POST: createAction } = require('../[id]/actions/route');
const { PATCH: updateAction } = require('../[id]/actions/[actionId]/route');

function makeRequest(url: string, options?: { method?: string; body?: any }) {
  const req = new Request(`http://localhost:3000${url}`, {
    method: options?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
  return req as any;
}

const mockContext = {
  user: {
    id: 'user-1',
    email: 'dr@test.com',
    role: 'PHYSICIAN',
    organizationId: 'org-1',
  },
};

const mockIncidentUnderInvestigation = {
  id: 'inc-1',
  reportedById: 'user-1',
  isAnonymous: false,
  patientId: 'patient-1',
  encounterId: 'encounter-1',
  eventType: 'ADVERSE_EVENT',
  severity: 'HIGH',
  status: 'UNDER_INVESTIGATION',
  title: 'Medication error during shift change',
  description: 'Wrong dosage administered due to handoff miscommunication',
  location: 'Ward 3B',
  involvedStaff: ['staff-1', 'staff-2'],
  involvedSystems: ['ehr-system'],
  dateOccurred: new Date('2026-03-28T10:00:00.000Z'),
  createdAt: new Date('2026-03-28T10:05:00.000Z'),
  updatedAt: new Date('2026-03-28T10:05:00.000Z'),
};

const mockRCAResult = {
  eventId: 'inc-1',
  fishbone: {
    eventId: 'inc-1',
    findings: [
      {
        bone: 'COMMUNICATION',
        finding: 'Handoff protocol not followed',
        evidence: 'No structured handoff checklist used',
        contributionLevel: 'PRIMARY',
      },
      {
        bone: 'PEOPLE_STAFF',
        finding: 'Fatigue during double shift',
        evidence: 'Staff on 16-hour shift',
        contributionLevel: 'CONTRIBUTING',
      },
    ],
    createdAt: new Date('2026-03-28T12:00:00.000Z'),
  },
  fiveWhys: {
    eventId: 'inc-1',
    steps: [
      { level: 1, why: 'Wrong dosage given', evidence: 'Chart review', isSystemic: false },
      { level: 2, why: 'Handoff miscommunication', evidence: 'Staff interview', isSystemic: true },
    ],
    rootCause: 'No structured handoff protocol enforced',
  },
  correctiveActions: [
    {
      id: 'ca-auto-1',
      description: 'Implement standardized handoff checklist',
      strength: 'PROCESS',
      responsible: 'user-1',
      deadline: new Date('2026-04-28T00:00:00.000Z'),
      status: 'PROPOSED',
      measurableOutcome: 'Zero handoff-related incidents in 90 days',
    },
  ],
  rootCauses: ['No structured handoff protocol enforced'],
  completedAt: new Date('2026-03-28T12:00:00.000Z'),
};

const validRCAPayload = {
  findings: ['Handoff protocol not followed', 'Fatigue during double shift'],
  whyChain: ['Wrong dosage given', 'Handoff miscommunication'],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/safety-incidents/[id]/rca', () => {
  it('performs RCA and returns result', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(
      mockIncidentUnderInvestigation,
    );
    (performRCA as jest.Mock).mockReturnValue(mockRCAResult);
    (prisma.safetyIncident.update as jest.Mock).mockResolvedValue({});
    (prisma.safetyCorrectiveAction.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (transitionIncident as jest.Mock).mockResolvedValue({});

    const req = makeRequest('/api/safety-incidents/inc-1/rca', {
      method: 'POST',
      body: validRCAPayload,
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await executeRCA(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.eventId).toBe('inc-1');
    expect(json.data.rootCauses).toEqual(['No structured handoff protocol enforced']);
  });

  it('persists fishbone, fiveWhys, rootCauses, and fishboneBones', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(
      mockIncidentUnderInvestigation,
    );
    (performRCA as jest.Mock).mockReturnValue(mockRCAResult);
    (prisma.safetyIncident.update as jest.Mock).mockResolvedValue({});
    (prisma.safetyCorrectiveAction.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (transitionIncident as jest.Mock).mockResolvedValue({});

    const req = makeRequest('/api/safety-incidents/inc-1/rca', {
      method: 'POST',
      body: validRCAPayload,
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    await executeRCA(req, ctx);

    const updateCall = (prisma.safetyIncident.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.fishboneFindings).toBe(mockRCAResult.fishbone);
    expect(updateCall.data.fiveWhysChain).toBe(mockRCAResult.fiveWhys);
    expect(updateCall.data.rootCauses).toEqual(['No structured handoff protocol enforced']);
    expect(updateCall.data.fishboneBones).toEqual(['COMMUNICATION', 'PEOPLE_STAFF']);
    expect(updateCall.data.rcaReviewedById).toBe('user-1');
  });

  it('auto-creates corrective actions from RCA result', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(
      mockIncidentUnderInvestigation,
    );
    (performRCA as jest.Mock).mockReturnValue(mockRCAResult);
    (prisma.safetyIncident.update as jest.Mock).mockResolvedValue({});
    (prisma.safetyCorrectiveAction.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (transitionIncident as jest.Mock).mockResolvedValue({});

    const req = makeRequest('/api/safety-incidents/inc-1/rca', {
      method: 'POST',
      body: validRCAPayload,
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    await executeRCA(req, ctx);

    expect(prisma.safetyCorrectiveAction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          incidentId: 'inc-1',
          description: 'Implement standardized handoff checklist',
          strength: 'PROCESS',
          status: 'PROPOSED',
          responsibleId: 'user-1',
        }),
      ],
    });
  });

  it('transitions to ACTIONS_PENDING', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(
      mockIncidentUnderInvestigation,
    );
    (performRCA as jest.Mock).mockReturnValue(mockRCAResult);
    (prisma.safetyIncident.update as jest.Mock).mockResolvedValue({});
    (prisma.safetyCorrectiveAction.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (transitionIncident as jest.Mock).mockResolvedValue({});

    const req = makeRequest('/api/safety-incidents/inc-1/rca', {
      method: 'POST',
      body: validRCAPayload,
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    await executeRCA(req, ctx);

    expect(transitionIncident).toHaveBeenCalledWith(
      expect.anything(),
      'inc-1',
      'ACTIONS_PENDING',
      'user-1',
    );
  });

  it('returns 409 when not in UNDER_INVESTIGATION status', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue({
      ...mockIncidentUnderInvestigation,
      status: 'REPORTED',
    });

    const req = makeRequest('/api/safety-incidents/inc-1/rca', {
      method: 'POST',
      body: validRCAPayload,
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await executeRCA(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain('UNDER_INVESTIGATION');
    expect(performRCA).not.toHaveBeenCalled();
  });

  it('returns 422 for invalid payload (empty findings)', async () => {
    const req = makeRequest('/api/safety-incidents/inc-1/rca', {
      method: 'POST',
      body: { findings: [], whyChain: [] },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await executeRCA(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe('Validation failed');
    expect(prisma.safetyIncident.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for non-existent incident', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest('/api/safety-incidents/nonexistent/rca', {
      method: 'POST',
      body: validRCAPayload,
    });

    const ctx = { ...mockContext, params: { id: 'nonexistent' } };
    const res = await executeRCA(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Incident not found');
  });
});

describe('POST /api/safety-incidents/[id]/actions', () => {
  const actionPayload = {
    description: 'Redesign medication dispensing workflow with barcode verification',
    responsibleId: 'staff-1',
    deadline: '2026-04-30T00:00:00.000Z',
    measurableOutcome: 'Zero dispensing errors for 90 consecutive days',
  };

  const mockAction = {
    id: 'ca-1',
    incidentId: 'inc-1',
    description: actionPayload.description,
    strength: 'ARCHITECTURAL',
    responsibleId: 'staff-1',
    status: 'PROPOSED',
    deadline: new Date('2026-04-30T00:00:00.000Z'),
    measurableOutcome: actionPayload.measurableOutcome,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates action with auto-scored strength', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue({ id: 'inc-1' });
    (scoreActionStrength as jest.Mock).mockReturnValue('ARCHITECTURAL');
    (prisma.safetyCorrectiveAction.create as jest.Mock).mockResolvedValue(mockAction);

    const req = makeRequest('/api/safety-incidents/inc-1/actions', {
      method: 'POST',
      body: actionPayload,
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await createAction(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.strength).toBe('ARCHITECTURAL');
    expect(scoreActionStrength).toHaveBeenCalledWith(actionPayload.description);
    expect(prisma.safetyCorrectiveAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        incidentId: 'inc-1',
        strength: 'ARCHITECTURAL',
        responsibleId: 'staff-1',
      }),
    });
  });

  it('returns 404 for non-existent incident', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest('/api/safety-incidents/nonexistent/actions', {
      method: 'POST',
      body: actionPayload,
    });

    const ctx = { ...mockContext, params: { id: 'nonexistent' } };
    const res = await createAction(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Incident not found');
  });
});

describe('PATCH /api/safety-incidents/[id]/actions/[actionId]', () => {
  it('updates action status and sets timestamps', async () => {
    const existingAction = {
      id: 'ca-1',
      incidentId: 'inc-1',
    };

    const completedAction = {
      id: 'ca-1',
      incidentId: 'inc-1',
      status: 'COMPLETED',
      completedAt: new Date('2026-03-28T15:00:00.000Z'),
      completionEvidence: 'All barcode scanners deployed and tested',
    };

    (prisma.safetyCorrectiveAction.findUnique as jest.Mock).mockResolvedValue(existingAction);
    (prisma.safetyCorrectiveAction.update as jest.Mock).mockResolvedValue(completedAction);

    const req = makeRequest('/api/safety-incidents/inc-1/actions/ca-1', {
      method: 'PATCH',
      body: {
        status: 'COMPLETED',
        completionEvidence: 'All barcode scanners deployed and tested',
      },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1', actionId: 'ca-1' } };
    const res = await updateAction(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('COMPLETED');

    const updateCall = (prisma.safetyCorrectiveAction.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe('COMPLETED');
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    expect(updateCall.data.completionEvidence).toBe('All barcode scanners deployed and tested');
  });

  it('sets verifiedAt and verifiedById when status is VERIFIED', async () => {
    (prisma.safetyCorrectiveAction.findUnique as jest.Mock).mockResolvedValue({
      id: 'ca-1',
      incidentId: 'inc-1',
    });
    (prisma.safetyCorrectiveAction.update as jest.Mock).mockResolvedValue({
      id: 'ca-1',
      status: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedById: 'user-1',
    });

    const req = makeRequest('/api/safety-incidents/inc-1/actions/ca-1', {
      method: 'PATCH',
      body: {
        status: 'VERIFIED',
        verificationNotes: 'Confirmed zero errors over 90-day period',
      },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1', actionId: 'ca-1' } };
    await updateAction(req, ctx);

    const updateCall = (prisma.safetyCorrectiveAction.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe('VERIFIED');
    expect(updateCall.data.verifiedAt).toBeInstanceOf(Date);
    expect(updateCall.data.verifiedById).toBe('user-1');
  });

  it('returns 404 when action does not exist', async () => {
    (prisma.safetyCorrectiveAction.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest('/api/safety-incidents/inc-1/actions/bad-id', {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1', actionId: 'bad-id' } };
    const res = await updateAction(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Corrective action not found');
  });

  it('returns 404 when action does not belong to incident', async () => {
    (prisma.safetyCorrectiveAction.findUnique as jest.Mock).mockResolvedValue({
      id: 'ca-1',
      incidentId: 'inc-other',
    });

    const req = makeRequest('/api/safety-incidents/inc-1/actions/ca-1', {
      method: 'PATCH',
      body: { status: 'APPROVED' },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1', actionId: 'ca-1' } };
    const res = await updateAction(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Action does not belong to this incident');
  });
});
