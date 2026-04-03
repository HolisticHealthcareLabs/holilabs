import { NextRequest } from 'next/server';

// --- Mock setup (MUST come before require) ---

jest.mock('@/lib/prisma', () => ({
  prisma: {
    careTeam: { findUnique: jest.fn() },
    careConference: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
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
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { GET: listConferences, POST: createConference } = require('../route');
const { GET: getConference, PATCH: updateConference } = require('../[id]/route');
const { POST: startConference } = require('../[id]/start/route');
const { POST: completeConference } = require('../[id]/complete/route');

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

describe('Care Conferences API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  // ================================================================
  // POST /care-conferences
  // ================================================================
  describe('POST /care-conferences', () => {
    const validBody = {
      careTeamId: 'ct-1',
      patientId: 'pat-1',
      title: 'Weekly Care Conference',
      scheduledAt: '2026-04-01T10:00:00.000Z',
      agendaItems: ['Pain management', 'Medication review'],
      requiredAttendees: ['user-1', 'user-2'],
    };

    it('creates a conference with valid body', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
        id: 'ct-1',
        patientId: 'pat-1',
        status: 'ACTIVE',
      });

      const mockConference = { id: 'conf-1', ...validBody, status: 'SCHEDULED' };
      (prisma.careConference.create as jest.Mock).mockResolvedValue(mockConference);

      const req = buildRequest('http://localhost:3000/api/care-conferences', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createConference(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.id).toBe('conf-1');
      expect(json.data.status).toBe('SCHEDULED');
      expect(prisma.careConference.create).toHaveBeenCalledTimes(1);
    });

    it('returns 422 when careTeamId is missing', async () => {
      const req = buildRequest('http://localhost:3000/api/care-conferences', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, careTeamId: '' }),
      });

      const res = await createConference(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.error).toBe('Validation error');
    });

    it('returns 404 when care team does not exist', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue(null);

      const req = buildRequest('http://localhost:3000/api/care-conferences', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createConference(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Care team not found');
    });

    it('returns 409 when care team is not ACTIVE', async () => {
      (prisma.careTeam.findUnique as jest.Mock).mockResolvedValue({
        id: 'ct-1',
        patientId: 'pat-1',
        status: 'DISSOLVED',
      });

      const req = buildRequest('http://localhost:3000/api/care-conferences', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await createConference(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('DISSOLVED');
    });
  });

  // ================================================================
  // GET /care-conferences
  // ================================================================
  describe('GET /care-conferences', () => {
    it('lists conferences with pagination', async () => {
      const mockList = [
        { id: 'conf-1', title: 'Conference A', status: 'SCHEDULED' },
        { id: 'conf-2', title: 'Conference B', status: 'COMPLETED' },
      ];
      (prisma.careConference.findMany as jest.Mock).mockResolvedValue(mockList);
      (prisma.careConference.count as jest.Mock).mockResolvedValue(2);

      const req = buildRequest('http://localhost:3000/api/care-conferences');
      const res = await listConferences(req, { ...baseContext });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(json.pagination.total).toBe(2);
    });

    it('filters by careTeamId query param', async () => {
      (prisma.careConference.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.careConference.count as jest.Mock).mockResolvedValue(0);

      const req = buildRequest(
        'http://localhost:3000/api/care-conferences?careTeamId=ct-99',
      );
      await listConferences(req, { ...baseContext });

      const findManyCall = (prisma.careConference.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.careTeamId).toBe('ct-99');
    });
  });

  // ================================================================
  // GET /care-conferences/[id]
  // ================================================================
  describe('GET /care-conferences/[id]', () => {
    it('returns conference detail with care team', async () => {
      const mockDetail = {
        id: 'conf-1',
        title: 'Weekly',
        status: 'SCHEDULED',
        careTeam: { id: 'ct-1', members: [{ id: 'member-1', isActive: true }] },
      };
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue(mockDetail);

      const req = buildRequest('http://localhost:3000/api/care-conferences/conf-1');
      const res = await getConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe('conf-1');
      expect(json.data.careTeam.members).toHaveLength(1);
    });

    it('returns 404 when conference not found', async () => {
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue(null);

      const req = buildRequest('http://localhost:3000/api/care-conferences/missing');
      const res = await getConference(req, {
        ...baseContext,
        params: { id: 'missing' },
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Conference not found');
    });
  });

  // ================================================================
  // PATCH /care-conferences/[id]
  // ================================================================
  describe('PATCH /care-conferences/[id]', () => {
    it('updates conference title', async () => {
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'SCHEDULED',
      });
      (prisma.careConference.update as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        title: 'Updated Title',
      });

      const req = buildRequest('http://localhost:3000/api/care-conferences/conf-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const res = await updateConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.title).toBe('Updated Title');
    });
  });

  // ================================================================
  // POST /care-conferences/[id]/start
  // ================================================================
  describe('POST /care-conferences/[id]/start', () => {
    it('transitions a SCHEDULED conference to IN_PROGRESS', async () => {
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'SCHEDULED',
      });
      (prisma.careConference.update as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'IN_PROGRESS',
        actualAttendees: ['user-1'],
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-conferences/conf-1/start',
        {
          method: 'POST',
          body: JSON.stringify({ actualAttendees: ['user-1'] }),
        },
      );

      const res = await startConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('IN_PROGRESS');
    });

    it('returns 409 when conference is not SCHEDULED', async () => {
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'COMPLETED',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-conferences/conf-1/start',
        {
          method: 'POST',
          body: JSON.stringify({ actualAttendees: ['user-1'] }),
        },
      );

      const res = await startConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('COMPLETED');
    });

    it('returns 422 when actualAttendees is empty', async () => {
      const req = buildRequest(
        'http://localhost:3000/api/care-conferences/conf-1/start',
        {
          method: 'POST',
          body: JSON.stringify({ actualAttendees: [] }),
        },
      );

      const res = await startConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });

      expect(res.status).toBe(422);
    });
  });

  // ================================================================
  // POST /care-conferences/[id]/complete
  // ================================================================
  describe('POST /care-conferences/[id]/complete', () => {
    it('completes an IN_PROGRESS conference with decisions and summary', async () => {
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'IN_PROGRESS',
      });
      (prisma.careConference.update as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'COMPLETED',
        decisions: ['Increase PT frequency'],
        summary: 'Patient improving steadily',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-conferences/conf-1/complete',
        {
          method: 'POST',
          body: JSON.stringify({
            decisions: ['Increase PT frequency'],
            summary: 'Patient improving steadily',
            actionItems: [
              {
                description: 'Schedule follow-up',
                assignedTo: 'user-2',
                dueDate: '2026-04-15T00:00:00.000Z',
              },
            ],
          }),
        },
      );

      const res = await completeConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.status).toBe('COMPLETED');
      expect(json.data.decisions).toContain('Increase PT frequency');
    });

    it('returns 409 when conference is not IN_PROGRESS', async () => {
      (prisma.careConference.findUnique as jest.Mock).mockResolvedValue({
        id: 'conf-1',
        status: 'SCHEDULED',
      });

      const req = buildRequest(
        'http://localhost:3000/api/care-conferences/conf-1/complete',
        {
          method: 'POST',
          body: JSON.stringify({ summary: 'Summary text' }),
        },
      );

      const res = await completeConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('SCHEDULED');
    });

    it('returns 422 when summary is missing', async () => {
      const req = buildRequest(
        'http://localhost:3000/api/care-conferences/conf-1/complete',
        {
          method: 'POST',
          body: JSON.stringify({ decisions: ['Some decision'] }),
        },
      );

      const res = await completeConference(req, {
        ...baseContext,
        params: { id: 'conf-1' },
      });

      expect(res.status).toBe(422);
    });
  });
});
