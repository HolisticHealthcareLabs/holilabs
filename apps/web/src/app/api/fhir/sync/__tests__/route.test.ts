/**
 * Tests for /api/fhir/sync
 *
 * - POST triggers push sync for patient
 * - POST returns 400 for invalid request
 * - GET returns sync statistics
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/sync.service', () => ({
  createSyncService: jest.fn().mockReturnValue({
    pushPatient: jest.fn().mockResolvedValue('sync-evt-1'),
    pullPatient: jest.fn().mockResolvedValue('sync-evt-2'),
    getSyncStats: jest.fn().mockResolvedValue({
      totalSynced: 100,
      conflicts: 2,
      lastSyncAt: '2026-03-12T00:00:00Z',
    }),
  }),
}));

const { POST, GET } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/fhir/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('triggers push sync for patient', async () => {
    const request = new NextRequest('http://localhost:3000/api/fhir/sync', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'push',
        resourceType: 'Patient',
        localId: 'patient-1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.syncEventId).toBe('sync-evt-1');
    expect(data.data.status).toBe('PENDING');
  });

  it('returns 400 for invalid request (push without localId)', async () => {
    const request = new NextRequest('http://localhost:3000/api/fhir/sync', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'push',
        resourceType: 'Patient',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('triggers pull sync for patient', async () => {
    const request = new NextRequest('http://localhost:3000/api/fhir/sync', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'pull',
        resourceType: 'Patient',
        fhirResourceId: 'fhir-patient-1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.syncEventId).toBe('sync-evt-2');
  });
});

describe('GET /api/fhir/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns sync statistics', async () => {
    const request = new NextRequest('http://localhost:3000/api/fhir/sync');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.totalSynced).toBe(100);
    expect(data.data.stats.conflicts).toBe(2);
  });
});
