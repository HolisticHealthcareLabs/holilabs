jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (h: any) => h,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    safetyIncident: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    safetyCorrectiveAction: {
      count: jest.fn(),
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
  triageForFullRCA: jest.fn(),
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
const { triageForFullRCA } = require('@/lib/rca/safety-rca');
const { transitionIncident, InvalidTransitionError } =
  require('@/lib/rca/incident-state-machine');

const { POST: createIncident, GET: listIncidents } =
  require('../route');
const { POST: createNearMiss } = require('../near-miss/route');
const { GET: getIncident } = require('../[id]/route');
const { PATCH: triageIncident } = require('../[id]/triage/route');

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

const validIncidentPayload = {
  eventType: 'ADVERSE_EVENT',
  severity: 'HIGH',
  title: 'Medication error during shift change',
  description: 'Wrong dosage administered due to handoff miscommunication',
  patientId: 'patient-1',
  encounterId: 'encounter-1',
  location: 'Ward 3B',
  involvedStaff: ['staff-1', 'staff-2'],
  involvedSystems: ['ehr-system'],
  tags: ['medication', 'handoff'],
  dateOccurred: '2026-03-28T10:00:00.000Z',
  isAnonymous: false,
};

const mockIncident = {
  id: 'inc-1',
  reportedById: 'user-1',
  isAnonymous: false,
  patientId: 'patient-1',
  encounterId: 'encounter-1',
  eventType: 'ADVERSE_EVENT',
  severity: 'HIGH',
  status: 'REPORTED',
  title: 'Medication error during shift change',
  description: 'Wrong dosage administered due to handoff miscommunication',
  location: 'Ward 3B',
  involvedStaff: ['staff-1', 'staff-2'],
  involvedSystems: ['ehr-system'],
  requiresFullRCA: true,
  tags: ['medication', 'handoff'],
  dateOccurred: new Date('2026-03-28T10:00:00.000Z'),
  createdAt: new Date('2026-03-28T10:05:00.000Z'),
  updatedAt: new Date('2026-03-28T10:05:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/safety-incidents', () => {
  it('creates incident with valid data and returns 201', async () => {
    (triageForFullRCA as jest.Mock).mockReturnValue(true);
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue(mockIncident);

    const req = makeRequest('/api/safety-incidents', {
      method: 'POST',
      body: validIncidentPayload,
    });

    const res = await createIncident(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual(expect.objectContaining({ id: 'inc-1' }));
    expect(prisma.safetyIncident.create).toHaveBeenCalledTimes(1);
  });

  it('auto-triages via triageForFullRCA and sets requiresFullRCA', async () => {
    (triageForFullRCA as jest.Mock).mockReturnValue(true);
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue(mockIncident);

    const req = makeRequest('/api/safety-incidents', {
      method: 'POST',
      body: validIncidentPayload,
    });

    await createIncident(req, mockContext);

    expect(triageForFullRCA).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ADVERSE_EVENT',
        severity: 'HIGH',
        description: validIncidentPayload.description,
      }),
    );

    const createCall = (prisma.safetyIncident.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.requiresFullRCA).toBe(true);
  });

  it('sets reportedById from context.user.id when not anonymous', async () => {
    (triageForFullRCA as jest.Mock).mockReturnValue(false);
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue({
      ...mockIncident,
      requiresFullRCA: false,
    });

    const req = makeRequest('/api/safety-incidents', {
      method: 'POST',
      body: { ...validIncidentPayload, isAnonymous: false },
    });

    await createIncident(req, mockContext);

    const createCall = (prisma.safetyIncident.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.reportedById).toBe('user-1');
  });

  it('does NOT set reportedById when isAnonymous is true', async () => {
    (triageForFullRCA as jest.Mock).mockReturnValue(false);
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue({
      ...mockIncident,
      reportedById: undefined,
      isAnonymous: true,
    });

    const req = makeRequest('/api/safety-incidents', {
      method: 'POST',
      body: { ...validIncidentPayload, isAnonymous: true },
    });

    await createIncident(req, mockContext);

    const createCall = (prisma.safetyIncident.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data).not.toHaveProperty('reportedById');
    expect(createCall.data.isAnonymous).toBe(true);
  });

  it('returns 422 for invalid payload (missing required fields)', async () => {
    const req = makeRequest('/api/safety-incidents', {
      method: 'POST',
      body: { title: 'Missing fields' },
    });

    const res = await createIncident(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toBeDefined();
    expect(prisma.safetyIncident.create).not.toHaveBeenCalled();
  });

  it('returns 422 for invalid eventType', async () => {
    const req = makeRequest('/api/safety-incidents', {
      method: 'POST',
      body: { ...validIncidentPayload, eventType: 'INVALID_TYPE' },
    });

    const res = await createIncident(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe('Validation failed');
    expect(prisma.safetyIncident.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/safety-incidents', () => {
  const incidentsList = [
    { ...mockIncident, id: 'inc-1', _count: { correctiveActions: 2 } },
    { ...mockIncident, id: 'inc-2', _count: { correctiveActions: 0 } },
  ];

  it('returns paginated list with total count', async () => {
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue(incidentsList);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(2);

    const req = makeRequest('/api/safety-incidents?skip=0&take=20');
    const res = await listIncidents(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.skip).toBe(0);
    expect(json.take).toBe(20);
  });

  it('filters by status', async () => {
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest('/api/safety-incidents?status=TRIAGED');
    await listIncidents(req, mockContext);

    const findCall = (prisma.safetyIncident.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.status).toBe('TRIAGED');
  });

  it('filters by eventType', async () => {
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest('/api/safety-incidents?eventType=SENTINEL');
    await listIncidents(req, mockContext);

    const findCall = (prisma.safetyIncident.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.eventType).toBe('SENTINEL');
  });

  it('filters by severity', async () => {
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest('/api/safety-incidents?severity=CRITICAL');
    await listIncidents(req, mockContext);

    const findCall = (prisma.safetyIncident.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.severity).toBe('CRITICAL');
  });

  it('filters by date range', async () => {
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest(
      '/api/safety-incidents?dateFrom=2026-03-01T00:00:00Z&dateTo=2026-03-31T23:59:59Z',
    );
    await listIncidents(req, mockContext);

    const findCall = (prisma.safetyIncident.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.dateOccurred).toEqual({
      gte: new Date('2026-03-01T00:00:00Z'),
      lte: new Date('2026-03-31T23:59:59Z'),
    });
  });

  it('filters by tags (hasSome)', async () => {
    (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest('/api/safety-incidents?tags=medication,handoff');
    await listIncidents(req, mockContext);

    const findCall = (prisma.safetyIncident.findMany as jest.Mock).mock.calls[0][0];
    expect(findCall.where.tags).toEqual({ hasSome: ['medication', 'handoff'] });
  });
});

describe('POST /api/safety-incidents/near-miss', () => {
  const nearMissPayload = {
    title: 'Near-miss: mislabeled specimen',
    description: 'Specimen label had wrong patient name, caught before processing',
    location: 'Lab Room 2',
    involvedSystems: ['lims'],
    tags: ['labeling'],
  };

  const mockNearMiss = {
    id: 'inc-nm-1',
    reportedById: 'user-1',
    isAnonymous: false,
    eventType: 'NEAR_MISS',
    severity: 'LOW',
    status: 'REPORTED',
    title: nearMissPayload.title,
    description: nearMissPayload.description,
    location: nearMissPayload.location,
    involvedSystems: nearMissPayload.involvedSystems,
    tags: nearMissPayload.tags,
    requiresFullRCA: false,
    dateOccurred: expect.any(Date),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates near-miss with simplified fields', async () => {
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue(mockNearMiss);

    const req = makeRequest('/api/safety-incidents/near-miss', {
      method: 'POST',
      body: nearMissPayload,
    });

    const res = await createNearMiss(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.eventType).toBe('NEAR_MISS');
    expect(prisma.safetyIncident.create).toHaveBeenCalledTimes(1);
  });

  it('hardcodes eventType=NEAR_MISS and severity=LOW', async () => {
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue(mockNearMiss);

    const req = makeRequest('/api/safety-incidents/near-miss', {
      method: 'POST',
      body: nearMissPayload,
    });

    await createNearMiss(req, mockContext);

    const createCall = (prisma.safetyIncident.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.eventType).toBe('NEAR_MISS');
    expect(createCall.data.severity).toBe('LOW');
    expect(createCall.data.requiresFullRCA).toBe(false);
  });

  it('supports anonymous reporting', async () => {
    (prisma.safetyIncident.create as jest.Mock).mockResolvedValue({
      ...mockNearMiss,
      reportedById: undefined,
      isAnonymous: true,
    });

    const req = makeRequest('/api/safety-incidents/near-miss', {
      method: 'POST',
      body: { ...nearMissPayload, isAnonymous: true },
    });

    await createNearMiss(req, mockContext);

    const createCall = (prisma.safetyIncident.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.isAnonymous).toBe(true);
    expect(createCall.data).not.toHaveProperty('reportedById');
  });
});

describe('GET /api/safety-incidents/[id]', () => {
  const mockDetailIncident = {
    ...mockIncident,
    correctiveActions: [
      {
        id: 'ca-1',
        incidentId: 'inc-1',
        description: 'Implement barcode scanning',
        strength: 'ARCHITECTURAL',
        status: 'PROPOSED',
      },
    ],
    reportedBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
    leadInvestigator: null,
  };

  it('returns incident with correctiveActions', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(
      mockDetailIncident,
    );

    const req = makeRequest('/api/safety-incidents/inc-1');
    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await getIncident(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe('inc-1');
    expect(json.data.correctiveActions).toHaveLength(1);
    expect(json.data.reportedBy.firstName).toBe('Jane');
  });

  it('returns 404 for non-existent incident', async () => {
    (prisma.safetyIncident.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest('/api/safety-incidents/nonexistent');
    const ctx = { ...mockContext, params: { id: 'nonexistent' } };
    const res = await getIncident(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Incident not found');
  });
});

describe('PATCH /api/safety-incidents/[id]/triage', () => {
  const triagedIncident = {
    ...mockIncident,
    status: 'TRIAGED',
    severity: 'CRITICAL',
    leadInvestigatorId: 'investigator-1',
  };

  it('transitions to TRIAGED and updates fields', async () => {
    (transitionIncident as jest.Mock).mockResolvedValue({
      ...mockIncident,
      status: 'TRIAGED',
    });
    (prisma.safetyIncident.update as jest.Mock).mockResolvedValue(triagedIncident);

    const req = makeRequest('/api/safety-incidents/inc-1/triage', {
      method: 'PATCH',
      body: {
        severity: 'CRITICAL',
        leadInvestigatorId: 'investigator-1',
        triageNotes: 'Escalated due to severity reassessment',
      },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await triageIncident(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(transitionIncident).toHaveBeenCalledWith(
      expect.anything(),
      'inc-1',
      'TRIAGED',
      'user-1',
      'Escalated due to severity reassessment',
    );
    expect(prisma.safetyIncident.update).toHaveBeenCalledWith({
      where: { id: 'inc-1' },
      data: {
        severity: 'CRITICAL',
        leadInvestigatorId: 'investigator-1',
      },
    });
    expect(json.data.status).toBe('TRIAGED');
  });

  it('handles InvalidTransitionError with 409', async () => {
    (transitionIncident as jest.Mock).mockRejectedValue(
      new InvalidTransitionError('RESOLVED', 'TRIAGED'),
    );

    const req = makeRequest('/api/safety-incidents/inc-1/triage', {
      method: 'PATCH',
      body: { triageNotes: 'Attempt on resolved' },
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await triageIncident(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain('Invalid transition');
  });
});
