/**
 * Tests for PATCH /api/encounters/[id]/status
 *
 * Validates encounter status transitions:
 * - Happy path → 200 with updated encounter (SCHEDULED → CHECKED_IN)
 * - Invalid transition → 422
 * - Encounter not found → 404
 * - Forbidden (non-provider) → 403
 * - Missing status field → 400
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalEncounter: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/clinical/safety/governance-events', () => ({
  logSafetyRuleFired: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'provider-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'enc-001' },
  requestId: 'req-1',
};

const MOCK_ENCOUNTER = {
  id: 'enc-001',
  status: 'SCHEDULED',
  patientId: 'patient-1',
  providerId: 'provider-1',
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/encounters/enc-001/status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PATCH /api/encounters/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('transitions SCHEDULED → CHECKED_IN', async () => {
    const updated = { ...MOCK_ENCOUNTER, status: 'CHECKED_IN' };

    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(MOCK_ENCOUNTER);
    (prisma.clinicalEncounter.update as jest.Mock).mockResolvedValue(updated);

    const req = makeRequest({ status: 'CHECKED_IN' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.encounter.status).toBe('CHECKED_IN');
    expect(prisma.clinicalEncounter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enc-001' },
        data: expect.objectContaining({ status: 'CHECKED_IN' }),
      })
    );
  });

  it('returns 422 for invalid state transition', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(MOCK_ENCOUNTER);

    const req = makeRequest({ status: 'COMPLETED' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toContain('Invalid status transition');
    expect(data.allowedTransitions).toEqual(['CHECKED_IN', 'CANCELLED']);
    expect(prisma.clinicalEncounter.update).not.toHaveBeenCalled();
  });

  it('returns 404 when encounter not found', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ status: 'CHECKED_IN' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Encounter not found');
  });

  it('returns 403 for non-assigned provider', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_ENCOUNTER,
      providerId: 'other-provider',
    });

    const req = makeRequest({ status: 'CHECKED_IN' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('returns 400 when status field is missing', async () => {
    const req = makeRequest({});
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing required field: status');
  });
});
