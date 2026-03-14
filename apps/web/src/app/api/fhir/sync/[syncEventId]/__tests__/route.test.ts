import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/services/sync.service', () => ({
  createSyncService: jest.fn().mockReturnValue({
    getSyncStatus: jest.fn(),
  }),
}));

const { GET } = require('../route');
const { createSyncService } = require('@/lib/services/sync.service');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockSyncEvent = {
  id: 'sync-1',
  direction: 'INBOUND',
  resourceType: 'Patient',
  resourceId: 'patient-1',
  operation: 'UPDATE',
  status: 'SYNCED',
  createdAt: new Date(),
  syncedAt: new Date(),
  resolution: 'ACCEPTED',
  resolvedBy: 'user-1',
  resolvedAt: new Date(),
};

describe('GET /api/fhir/sync/[syncEventId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    const mockService = createSyncService();
    (mockService.getSyncStatus as jest.Mock).mockResolvedValue(mockSyncEvent);
  });

  it('returns sync event status', async () => {
    const req = new NextRequest('http://localhost:3000/api/fhir/sync/sync-1');
    const context = {
      user: { id: 'user-1', role: 'CLINICIAN' },
      params: { syncEventId: 'sync-1' },
    };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('sync-1');
    expect(data.data.status).toBe('SYNCED');
  });

  it('returns 404 when sync event not found', async () => {
    const mockService = createSyncService();
    (mockService.getSyncStatus as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/fhir/sync/nonexistent');
    const context = {
      user: { id: 'user-1', role: 'CLINICIAN' },
      params: { syncEventId: 'nonexistent' },
    };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 when syncEventId param is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/fhir/sync/');
    const context = {
      user: { id: 'user-1', role: 'CLINICIAN' },
      params: {},
    };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('includes conflictData message for CONFLICT status', async () => {
    const mockService = createSyncService();
    (mockService.getSyncStatus as jest.Mock).mockResolvedValue({
      ...mockSyncEvent,
      status: 'CONFLICT',
      conflictData: { local: 'A', remote: 'B' },
    });

    const req = new NextRequest('http://localhost:3000/api/fhir/sync/sync-2');
    const context = {
      user: { id: 'user-1', role: 'CLINICIAN' },
      params: { syncEventId: 'sync-2' },
    };
    const res = await GET(req, context);
    const data = await res.json();

    expect(data.data.message).toContain('Human review required');
    expect(data.data.conflictData).toBeDefined();
  });
});
