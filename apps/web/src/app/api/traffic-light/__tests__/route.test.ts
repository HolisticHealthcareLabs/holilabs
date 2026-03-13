import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn(), auditView: jest.fn(), auditCreate: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/auth/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/hash', () => ({
  verifyInternalAgentToken: jest.fn().mockReturnValue(false),
}));
jest.mock('@/lib/traffic-light/engine', () => ({
  trafficLightEngine: {
    evaluate: jest.fn(),
    getRules: jest.fn(),
  },
}));
jest.mock('@/services/assurance-capture.service', () => ({
  assuranceCaptureService: {
    captureAIEvent: jest.fn(),
    recordHumanDecision: jest.fn(),
  },
}));
jest.mock('@/lib/socket-server', () => ({
  emitTrafficLightEvent: jest.fn(),
}));
jest.mock('@/services/data-flywheel.service', () => ({
  dataFlywheelService: {
    ingest: jest.fn(),
  },
}));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { auth } = require('@/lib/auth/auth');
const { trafficLightEngine } = require('@/lib/traffic-light/engine');
const { createAuditLog } = require('@/lib/audit');
const { dataFlywheelService } = require('@/services/data-flywheel.service');

const validEvalBody = {
  patientId: 'patient-1',
  action: 'prescription',
  payload: {
    medication: { name: 'Amoxicillin', dose: '500mg', frequency: 'TID' },
  },
};

const mockEvalResult = {
  color: 'GREEN',
  signals: [],
  canOverride: false,
  overrideRequires: null,
  totalGlosaRisk: 0,
  needsChatAssistance: false,
  summary: 'No issues found',
  metadata: { patientIdHash: 'hash-abc', serverLatencyMs: 5 },
};

describe('POST /api/traffic-light (evaluate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ user: { id: 'user-1' } });
    trafficLightEngine.evaluate.mockResolvedValue(mockEvalResult);
    createAuditLog.mockResolvedValue({ id: 'a1' });
    dataFlywheelService.ingest.mockResolvedValue(undefined);
  });

  it('returns GREEN when no signals triggered', async () => {
    const req = new NextRequest('http://localhost:3000/api/traffic-light', {
      method: 'POST',
      body: JSON.stringify(validEvalBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.color).toBe('GREEN');
  });

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/traffic-light', {
      method: 'POST',
      body: JSON.stringify(validEvalBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when action is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/traffic-light', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1', action: 'invalid-action', payload: {} }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/traffic-light (rules)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ user: { id: 'user-1' } });
    trafficLightEngine.getRules.mockReturnValue({
      clinical: [{ id: 'r1', name: 'Drug Allergy', category: 'SAFETY', defaultColor: 'RED', isActive: true, description: 'desc', descriptionPortuguese: 'pt', regulatoryReference: 'ref' }],
      administrative: [],
      billing: [],
    });
  });

  it('returns available rules list', async () => {
    const req = new NextRequest('http://localhost:3000/api/traffic-light');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.rules).toBeDefined();
  });

  it('returns 401 when not authenticated', async () => {
    auth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/traffic-light');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
