import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    medication: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  requestId: 'req-1',
};

const mockMedication = {
  id: 'med-1',
  name: 'Metformin',
  dosage: '500mg',
  isActive: true,
  createdAt: new Date(),
  prescriber: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', profilePictureUrl: null },
  prescription: { id: 'rx-1', signedAt: new Date(), status: 'ACTIVE', refillsRemaining: 3, daysSupply: 30 },
};

describe('GET /api/portal/medications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all medications with summary', async () => {
    (prisma.medication.findMany as jest.Mock).mockResolvedValue([mockMedication]);

    const req = new NextRequest('http://localhost:3000/api/portal/medications');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.medications).toHaveLength(1);
    expect(data.data.summary.active).toBe(1);
    expect(data.data.summary.total).toBe(1);
  });

  it('filters active medications when active=true query param is set', async () => {
    (prisma.medication.findMany as jest.Mock).mockResolvedValue([mockMedication]);

    const req = new NextRequest('http://localhost:3000/api/portal/medications?active=true');
    const res = await GET(req, mockContext);

    expect(prisma.medication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
    expect(res.status).toBe(200);
  });

  it('separates active and inactive medications', async () => {
    const inactiveMed = { ...mockMedication, id: 'med-2', isActive: false };
    (prisma.medication.findMany as jest.Mock).mockResolvedValue([mockMedication, inactiveMed]);

    const req = new NextRequest('http://localhost:3000/api/portal/medications');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.summary.active).toBe(1);
    expect(data.data.summary.inactive).toBe(1);
    expect(data.data.activeMedications).toHaveLength(1);
    expect(data.data.inactiveMedications).toHaveLength(1);
  });

  it('returns empty lists when patient has no medications', async () => {
    (prisma.medication.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/portal/medications');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.summary.total).toBe(0);
    expect(data.data.needsRefill).toHaveLength(0);
  });
});
