export {};

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (h: any) => h,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
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

jest.mock('@/lib/rca/trend-analyzer', () => ({
  analyzeTrendsByField: jest.fn(),
  analyzeTrendsByBone: jest.fn(),
  analyzeTrendsByMonth: jest.fn(),
  detectRecurringPatterns: jest.fn(),
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
  ResolveGateError: class extends Error {
    name = 'ResolveGateError';
    constructor(public pendingActionIds: string[]) {
      super(
        `Cannot resolve: ${pendingActionIds.length} corrective action(s) not yet VERIFIED`,
      );
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
const {
  analyzeTrendsByField,
  analyzeTrendsByBone,
  analyzeTrendsByMonth,
  detectRecurringPatterns,
} = require('@/lib/rca/trend-analyzer');
const { transitionIncident, ResolveGateError } =
  require('@/lib/rca/incident-state-machine');

const { GET: getTrends } = require('../trends/route');
const { PATCH: resolveIncident } = require('../[id]/resolve/route');

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
    email: 'admin@test.com',
    role: 'ADMIN',
    organizationId: 'org-1',
  },
};

const mockByEventType = [
  { value: 'ADVERSE_EVENT', count: 12 },
  { value: 'NEAR_MISS', count: 28 },
  { value: 'SENTINEL', count: 3 },
];

const mockBySeverity = [
  { value: 'LOW', count: 15 },
  { value: 'MODERATE', count: 18 },
  { value: 'HIGH', count: 8 },
  { value: 'CRITICAL', count: 2 },
];

const mockByBone = [
  { bone: 'COMMUNICATION', count: 14 },
  { bone: 'EQUIPMENT', count: 7 },
  { bone: 'PEOPLE_STAFF', count: 10 },
];

const mockByMonth = [
  { month: '2026-01', count: 10 },
  { month: '2026-02', count: 15 },
  { month: '2026-03', count: 18 },
];

const mockRecurringPatterns = [
  {
    pattern: 'Handoff communication failures',
    occurrences: 5,
    lastSeen: new Date('2026-03-25T00:00:00.000Z'),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/safety-incidents/trends', () => {
  it('returns all trend data', async () => {
    (analyzeTrendsByField as jest.Mock)
      .mockResolvedValueOnce(mockByEventType)
      .mockResolvedValueOnce(mockBySeverity);
    (analyzeTrendsByBone as jest.Mock).mockResolvedValue(mockByBone);
    (analyzeTrendsByMonth as jest.Mock).mockResolvedValue(mockByMonth);
    (detectRecurringPatterns as jest.Mock).mockResolvedValue(mockRecurringPatterns);

    const req = makeRequest('/api/safety-incidents/trends');
    const res = await getTrends(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.byEventType).toEqual(mockByEventType);
    expect(json.data.bySeverity).toEqual(mockBySeverity);
    expect(json.data.byBone).toEqual(mockByBone);
    expect(json.data.byMonth).toEqual(mockByMonth);
    expect(json.data.recurringPatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pattern: 'Handoff communication failures' }),
      ]),
    );
  });

  it('passes dateFrom/dateTo query params to analyzers', async () => {
    (analyzeTrendsByField as jest.Mock).mockResolvedValue([]);
    (analyzeTrendsByBone as jest.Mock).mockResolvedValue([]);
    (analyzeTrendsByMonth as jest.Mock).mockResolvedValue([]);
    (detectRecurringPatterns as jest.Mock).mockResolvedValue([]);

    const req = makeRequest(
      '/api/safety-incidents/trends?dateFrom=2026-01-01T00:00:00Z&dateTo=2026-03-31T23:59:59Z',
    );
    await getTrends(req, mockContext);

    const expectedFrom = new Date('2026-01-01T00:00:00Z');
    const expectedTo = new Date('2026-03-31T23:59:59Z');

    expect(analyzeTrendsByField).toHaveBeenCalledWith(
      expect.anything(),
      'eventType',
      expectedFrom,
      expectedTo,
    );
    expect(analyzeTrendsByField).toHaveBeenCalledWith(
      expect.anything(),
      'severity',
      expectedFrom,
      expectedTo,
    );
    expect(analyzeTrendsByBone).toHaveBeenCalledWith(
      expect.anything(),
      expectedFrom,
      expectedTo,
    );
  });

  it('passes months param to analyzeTrendsByMonth', async () => {
    (analyzeTrendsByField as jest.Mock).mockResolvedValue([]);
    (analyzeTrendsByBone as jest.Mock).mockResolvedValue([]);
    (analyzeTrendsByMonth as jest.Mock).mockResolvedValue([]);
    (detectRecurringPatterns as jest.Mock).mockResolvedValue([]);

    const req = makeRequest('/api/safety-incidents/trends?months=6');
    await getTrends(req, mockContext);

    expect(analyzeTrendsByMonth).toHaveBeenCalledWith(expect.anything(), 6);
  });

  it('handles errors gracefully', async () => {
    const { safeErrorResponse } = require('@/lib/api/safe-error-response');
    const dbError = new Error('DB connection lost');
    (analyzeTrendsByField as jest.Mock).mockRejectedValue(dbError);
    (analyzeTrendsByBone as jest.Mock).mockRejectedValue(dbError);
    (analyzeTrendsByMonth as jest.Mock).mockRejectedValue(dbError);
    (detectRecurringPatterns as jest.Mock).mockRejectedValue(dbError);

    const req = makeRequest('/api/safety-incidents/trends');
    const res = await getTrends(req, mockContext);

    expect(safeErrorResponse).toHaveBeenCalledWith(
      dbError,
      { userMessage: 'Failed to analyze trends' },
    );
  });
});

describe('PATCH /api/safety-incidents/[id]/resolve', () => {
  it('returns 409 when corrective actions not verified (ResolveGateError)', async () => {
    (prisma.safetyCorrectiveAction.count as jest.Mock).mockResolvedValue(3);
    (transitionIncident as jest.Mock).mockRejectedValue(
      new ResolveGateError(['ca-1', 'ca-2']),
    );

    const req = makeRequest('/api/safety-incidents/inc-1/resolve', {
      method: 'PATCH',
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await resolveIncident(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain('not yet VERIFIED');
    expect(json.pendingActionIds).toEqual(['ca-1', 'ca-2']);
  });

  it('returns 409 when no corrective actions exist', async () => {
    (prisma.safetyCorrectiveAction.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest('/api/safety-incidents/inc-1/resolve', {
      method: 'PATCH',
    });

    const ctx = { ...mockContext, params: { id: 'inc-1' } };
    const res = await resolveIncident(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('No corrective actions to verify');
    expect(transitionIncident).not.toHaveBeenCalled();
  });
});
