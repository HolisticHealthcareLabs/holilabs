/**
 * Tests for GET /api/encounters/[id]/summary
 *
 * Returns encounter + linked prescriptions + alert count:
 * - Happy path → 200 with encounter summary
 * - Encounter not found → 404
 * - Missing encounter ID → 400
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: () => Promise.resolve(true),
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
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'enc-001' },
  requestId: 'req-1',
};

const MOCK_ENCOUNTER = {
  id: 'enc-001',
  status: 'IN_PROGRESS',
  chiefComplaint: 'Headache and fatigue',
  scheduledAt: new Date('2025-01-15T09:00:00Z'),
  startedAt: new Date('2025-01-15T09:05:00Z'),
  endedAt: null,
  patient: {
    id: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
    mrn: 'MRN-001',
  },
  provider: {
    id: 'clinician-1',
    firstName: 'Dr.',
    lastName: 'Smith',
  },
  prescriptions: [
    {
      id: 'rx-1',
      medications: [{ name: 'ibuprofen', dose: '400mg' }],
      diagnosis: 'G43.909',
      status: 'PENDING',
      createdAt: new Date('2025-01-15T09:15:00Z'),
    },
  ],
};

describe('GET /api/encounters/[id]/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns encounter summary with prescriptions', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(MOCK_ENCOUNTER);

    const req = new NextRequest('http://localhost:3000/api/encounters/enc-001/summary');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.encounter.id).toBe('enc-001');
    expect(data.encounter.status).toBe('IN_PROGRESS');
    expect(data.encounter.patient.firstName).toBe('Jane');
    expect(data.encounter.provider.lastName).toBe('Smith');
    expect(data.prescriptions).toHaveLength(1);
    expect(data.prescriptionCount).toBe(1);
  });

  it('returns 404 when encounter not found', async () => {
    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/encounters/enc-999/summary');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Encounter not found');
  });

  it('returns 400 when encounter ID is missing', async () => {
    const ctxNoId = {
      ...mockContext,
      params: {},
    };

    const req = new NextRequest('http://localhost:3000/api/encounters//summary');
    const res = await GET(req, ctxNoId);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing encounter ID');
  });

  it('returns empty prescriptions array when none exist', async () => {
    const encounterNoPrescriptions = {
      ...MOCK_ENCOUNTER,
      prescriptions: [],
    };

    (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue(
      encounterNoPrescriptions
    );

    const req = new NextRequest('http://localhost:3000/api/encounters/enc-001/summary');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prescriptions).toHaveLength(0);
    expect(data.prescriptionCount).toBe(0);
  });
});
