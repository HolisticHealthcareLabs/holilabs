import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
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

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

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

const mockContext = {
  session: { userId: 'pu-1', patientId: 'pat-1', email: 'patient@test.com' },
  requestId: 'req-1',
  params: {},
};

function makeRequest(medId: string = 'med-1') {
  return new NextRequest(`http://localhost:3000/api/portal/medications/${medId}`);
}

describe('GET /api/portal/medications/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns medication details for authenticated patient (200)', async () => {
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);

    const res = await GET(makeRequest('med-1'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('med-1');
    expect(data.data.name).toBe('Metformin 500mg');
  });

  it('returns 404 when medication not found', async () => {
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest('nonexistent'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 403 when medication belongs to another patient', async () => {
    (prisma.medication.findUnique as jest.Mock).mockResolvedValue(mockMedication);

    const otherContext = {
      ...mockContext,
      session: { ...mockContext.session, patientId: 'pat-OTHER' },
    };

    const res = await GET(makeRequest('med-1'), otherContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
