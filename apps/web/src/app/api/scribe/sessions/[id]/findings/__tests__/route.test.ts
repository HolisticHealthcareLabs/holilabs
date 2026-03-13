import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    scribeSession: { findFirst: jest.fn() },
    auditLog: { findMany: jest.fn(), create: jest.fn() },
    clinicalEncounter: { findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/socket-server', () => ({
  emitCoPilotEvent: jest.fn(),
}));
jest.mock('@/lib/services', () => ({
  preventionEngine: {
    processTranscriptFindings: jest.fn().mockResolvedValue({
      detectedConditions: [],
      recommendations: [],
      processingTimeMs: 5,
    }),
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'sess-1' },
};

const mockSession = { id: 'sess-1', patientId: 'patient-1', clinicianId: 'clinician-1' };

describe('GET /api/scribe/sessions/[id]/findings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns findings audit logs for the session', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(mockSession);
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'log-1', timestamp: new Date(), details: { findings: { symptoms: ['fever'] } }, dataHash: 'hash-1' },
    ]);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/sess-1/findings');
    const res = await GET(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });

  it('returns 404 when session not found', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/nonexistent/findings');
    const res = await GET(req, mockContext);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/scribe/sessions/[id]/findings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates findings audit log and returns 201', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(mockSession);
    prisma.auditLog.create.mockResolvedValue({ id: 'log-1', timestamp: new Date() });
    prisma.clinicalEncounter.findFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/sess-1/findings', {
      method: 'POST',
      body: JSON.stringify({ chiefComplaint: 'Headache', symptoms: ['headache'], source: 'client-heuristic' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('log-1');
  });

  it('returns 400 when findings payload is invalid', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(mockSession);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/sess-1/findings', {
      method: 'POST',
      body: JSON.stringify({ symptoms: 'not-an-array' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
  });

  it('returns 404 when session not found', async () => {
    prisma.scribeSession.findFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/scribe/sessions/nonexistent/findings', {
      method: 'POST',
      body: JSON.stringify({ source: 'client-heuristic' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    expect(res.status).toBe(404);
  });
});
