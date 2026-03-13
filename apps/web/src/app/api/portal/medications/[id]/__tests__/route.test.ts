import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    medication: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/auth/patient-session', () => ({
  requirePatientSession: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { requirePatientSession } = require('@/lib/auth/patient-session');

const mockMedication = {
  id: 'med-1',
  name: 'Metformin 500mg',
  patientId: 'pat-1',
  isActive: true,
  prescriber: {
    id: 'doc-1',
    firstName: 'Ana',
    lastName: 'García',
    specialty: 'Internal Medicine',
    profilePictureUrl: null,
  },
};

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/portal/medications/med-1');
}

describe('GET /api/portal/medications/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns medication details for authenticated patient (200)', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);

    const res = await GET(makeRequest(), { params: { id: 'med-1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('med-1');
    expect(data.data.name).toBe('Metformin 500mg');
  });

  it('returns 400 when medication ID is missing', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });

    const res = await GET(makeRequest(), { params: {} });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Medication ID/i);
  });

  it('returns 404 when medication not found', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: { id: 'nonexistent' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when medication belongs to another patient', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-OTHER' });
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);

    const res = await GET(makeRequest(), { params: { id: 'med-1' } });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
