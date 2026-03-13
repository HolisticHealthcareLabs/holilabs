import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    medication: { findUnique: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/auth/patient-session', () => ({
  requirePatientSession: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { requirePatientSession } = require('@/lib/auth/patient-session');

const mockMedication = {
  id: 'med-1',
  patientId: 'pat-1',
  name: 'Metformin 500mg',
  isActive: true,
};

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost:3000/api/portal/medications/med-1/refill', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/portal/medications/[id]/refill', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a refill request for active medication (201)', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({
      patientId: 'pat-1',
      userId: 'user-1',
      email: 'patient@test.com',
    });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);

    const res = await POST(makeRequest({ notes: 'Running low' }), { params: { id: 'med-1' } });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('PENDING');
    expect(data.data.medicationId).toBe('med-1');
  });

  it('returns 400 when medication ID is missing', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });

    const res = await POST(makeRequest({}), { params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Medication ID/i);
  });

  it('returns 404 when medication not found', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({}), { params: { id: 'nonexistent' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 when medication is inactive', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue({
      ...mockMedication,
      isActive: false,
    });

    const res = await POST(makeRequest({}), { params: { id: 'med-1' } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/inactivo/i);
  });

  it('returns 403 when medication belongs to another patient', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-OTHER' });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);

    const res = await POST(makeRequest({}), { params: { id: 'med-1' } });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
