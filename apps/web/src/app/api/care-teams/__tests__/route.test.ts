/**
 * Care Teams API route tests.
 *
 * Covers POST/GET /care-teams, GET/PATCH /care-teams/[id],
 * POST /care-teams/[id]/members, POST/GET /care-teams/[id]/tasks.
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — MUST be declared before any require()
// ---------------------------------------------------------------------------

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    careTeam: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    careTeamMembership: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    careTeamTask: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
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

// ---------------------------------------------------------------------------
// Require handlers AFTER mocks
// ---------------------------------------------------------------------------

const { prisma } = require('@/lib/prisma');

const careTeamsRoot = require('../route');
const careTeamById = require('../[id]/route');
const careTeamMembers = require('../[id]/members/route');
const careTeamTasks = require('../[id]/tasks/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:3000/api/care-teams';

function makeRequest(url: string, opts?: { method?: string; body?: any }): NextRequest {
  const init: RequestInit = { method: opts?.method ?? 'GET' };
  if (opts?.body) {
    init.method = opts.method ?? 'POST';
    init.body = JSON.stringify(opts.body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(new URL(url), init);
}

const defaultContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN', organizationId: 'org-1' },
  params: {},
};

function ctxWith(overrides: Record<string, any> = {}) {
  return { ...defaultContext, ...overrides };
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// POST /care-teams
// ===========================================================================

describe('POST /care-teams', () => {
  const handler = careTeamsRoot.POST;

  it('creates a care team with valid body', async () => {
    const mockTeam = {
      id: 'ct-1',
      patientId: 'pat-1',
      name: 'Cardiology Team',
      status: 'ACTIVE',
      members: [],
    };

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'pat-1' });
    (prisma.careTeam.create as jest.Mock).mockResolvedValue(mockTeam);

    const req = makeRequest(BASE_URL, {
      body: { patientId: 'pat-1', name: 'Cardiology Team' },
    });

    const res = await handler(req, ctxWith());
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe('ct-1');
    expect(prisma.careTeam.create).toHaveBeenCalledTimes(1);
  });

  it('returns 422 when patientId is missing', async () => {
    const req = makeRequest(BASE_URL, { body: { name: 'Team' } });
    const res = await handler(req, ctxWith());

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('Validation error');
  });

  it('returns 422 when name is missing', async () => {
    const req = makeRequest(BASE_URL, { body: { patientId: 'pat-1' } });
    const res = await handler(req, ctxWith());

    expect(res.status).toBe(422);
  });

  it('returns 404 when patient does not exist', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(BASE_URL, {
      body: { patientId: 'nonexistent', name: 'Team' },
    });

    const res = await handler(req, ctxWith());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Patient not found');
  });
});

// ===========================================================================
// GET /care-teams
// ===========================================================================

describe('GET /care-teams', () => {
  const handler = careTeamsRoot.GET;

  it('lists care teams for the user organization', async () => {
    const teams = [{ id: 'ct-1', name: 'Team A', members: [] }];
    (prisma.careTeam.findMany as jest.Mock).mockResolvedValue(teams);
    (prisma.careTeam.count as jest.Mock).mockResolvedValue(1);

    const req = makeRequest(BASE_URL);
    const res = await handler(req, ctxWith());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('filters by status query param', async () => {
    (prisma.careTeam.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.careTeam.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest(`${BASE_URL}?status=DISSOLVED`);
    const res = await handler(req, ctxWith());

    expect(res.status).toBe(200);
    expect(prisma.careTeam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DISSOLVED' }),
      }),
    );
  });
});

// ===========================================================================
// GET /care-teams/[id]
// ===========================================================================

describe('GET /care-teams/[id]', () => {
  const handler = careTeamById.GET;

  it('returns care team detail with members', async () => {
    const team = {
      id: 'ct-1',
      name: 'Team A',
      owningOrgId: 'org-1',
      members: [{ userId: 'user-1', isActive: true }],
      tasks: [],
      conferences: [],
      sharedCarePlans: [],
      goals: [],
    };
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue(team);

    const req = makeRequest(`${BASE_URL}/ct-1`);
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe('ct-1');
  });

  it('returns 404 for nonexistent team', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(`${BASE_URL}/nope`);
    const res = await handler(req, ctxWith({ params: { id: 'nope' } }));

    expect(res.status).toBe(404);
  });

  it('returns 403 for cross-org non-member access', async () => {
    const team = {
      id: 'ct-1',
      owningOrgId: 'other-org',
      members: [{ userId: 'user-99', isActive: true }],
    };
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue(team);

    const req = makeRequest(`${BASE_URL}/ct-1`);
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));

    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// PATCH /care-teams/[id]
// ===========================================================================

describe('PATCH /care-teams/[id]', () => {
  const handler = careTeamById.PATCH;

  it('updates team status to DISSOLVED and sets dissolvedAt', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      owningOrgId: 'org-1',
    });
    (prisma.careTeam.update as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      status: 'DISSOLVED',
      members: [],
    });

    const req = makeRequest(`${BASE_URL}/ct-1`, {
      method: 'PATCH',
      body: { status: 'DISSOLVED' },
    });

    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    expect(res.status).toBe(200);

    const updateCall = (prisma.careTeam.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe('DISSOLVED');
    expect(updateCall.data.dissolvedAt).toBeInstanceOf(Date);
  });

  it('returns 403 when user org does not own the team', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      owningOrgId: 'other-org',
    });

    const req = makeRequest(`${BASE_URL}/ct-1`, {
      method: 'PATCH',
      body: { name: 'Renamed' },
    });

    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// POST /care-teams/[id]/members
// ===========================================================================

describe('POST /care-teams/[id]/members', () => {
  const handler = careTeamMembers.POST;

  const validBody = {
    userId: 'user-2',
    role: 'SPECIALIST',
    organizationId: 'org-1',
  };

  it('adds a new member to an active team', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      owningOrgId: 'org-1',
      status: 'ACTIVE',
    });
    (prisma.careTeamMembership.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.careTeamMembership.create as jest.Mock).mockResolvedValue({
      id: 'mem-1',
      careTeamId: 'ct-1',
      userId: 'user-2',
      role: 'SPECIALIST',
    });

    const req = makeRequest(`${BASE_URL}/ct-1/members`, { body: validBody });
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.role).toBe('SPECIALIST');
  });

  it('returns 409 for duplicate active member', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      owningOrgId: 'org-1',
      status: 'ACTIVE',
    });
    (prisma.careTeamMembership.findUnique as jest.Mock).mockResolvedValue({
      id: 'mem-existing',
      isActive: true,
    });

    const req = makeRequest(`${BASE_URL}/ct-1/members`, { body: validBody });
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('already an active member');
  });

  it('returns 409 when team is DISSOLVED', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      owningOrgId: 'org-1',
      status: 'DISSOLVED',
    });

    const req = makeRequest(`${BASE_URL}/ct-1/members`, { body: validBody });
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('DISSOLVED');
  });
});

// ===========================================================================
// POST /care-teams/[id]/tasks
// ===========================================================================

describe('POST /care-teams/[id]/tasks', () => {
  const handler = careTeamTasks.POST;

  it('creates a task on an active care team', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      patientId: 'pat-1',
      status: 'ACTIVE',
      owningOrgId: 'org-1',
    });
    (prisma.careTeamTask.create as jest.Mock).mockResolvedValue({
      id: 'task-1',
      title: 'Follow up labs',
      status: 'PENDING',
    });

    const req = makeRequest(`${BASE_URL}/ct-1/tasks`, {
      body: { title: 'Follow up labs' },
    });

    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.status).toBe('PENDING');
  });

  it('returns 422 when title is missing', async () => {
    const req = makeRequest(`${BASE_URL}/ct-1/tasks`, {
      body: { description: 'No title provided' },
    });

    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    expect(res.status).toBe(422);
  });

  it('returns 409 when team is not ACTIVE', async () => {
    (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'ct-1',
      patientId: 'pat-1',
      status: 'ON_HOLD',
      owningOrgId: 'org-1',
    });

    const req = makeRequest(`${BASE_URL}/ct-1/tasks`, {
      body: { title: 'Follow up labs' },
    });

    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('ON_HOLD');
  });
});

// ===========================================================================
// GET /care-teams/[id]/tasks
// ===========================================================================

describe('GET /care-teams/[id]/tasks', () => {
  const handler = careTeamTasks.GET;

  it('returns paginated task list for a care team', async () => {
    const tasks = [{ id: 'task-1', title: 'Review imaging', status: 'PENDING' }];
    (prisma.careTeamTask.findMany as jest.Mock).mockResolvedValue(tasks);
    (prisma.careTeamTask.count as jest.Mock).mockResolvedValue(1);

    const req = makeRequest(`${BASE_URL}/ct-1/tasks`);
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('filters tasks by status query param', async () => {
    (prisma.careTeamTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.careTeamTask.count as jest.Mock).mockResolvedValue(0);

    const req = makeRequest(`${BASE_URL}/ct-1/tasks?status=COMPLETED`);
    const res = await handler(req, ctxWith({ params: { id: 'ct-1' } }));

    expect(res.status).toBe(200);
    expect(prisma.careTeamTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });
});
