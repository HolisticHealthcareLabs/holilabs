import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockPatient = {
  id: 'patient-1',
  mrn: 'MRN-001',
  tokenId: 'tok-1',
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: new Date('1990-01-15'),
  gender: 'FEMALE',
  email: 'maria@example.com',
  phone: '+5511999999999',
  address: '123 Main St',
  city: 'Buenos Aires',
  state: 'BA',
  postalCode: '1000',
  createdAt: new Date(),
  assignedClinician: { id: 'doc-1', firstName: 'Dr', lastName: 'Test', specialty: 'GP', licenseNumber: 'L1', email: 'dr@test.com' },
  medications: [{ id: 'm1' }],
  appointments: [{ id: 'a1' }],
  documents: [{ id: 'd1' }, { id: 'd2' }],
};

describe('GET /api/portal/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns patient profile with stats', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/profile'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.firstName).toBe('Maria');
    expect(data.data.stats.activeMedications).toBe(1);
    expect(data.data.stats.upcomingAppointments).toBe(1);
    expect(data.data.stats.totalDocuments).toBe(2);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/profile'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('PATCH /api/portal/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates profile with valid data', async () => {
    (prisma.patient.update as jest.Mock).mockResolvedValue({ ...mockPatient, phone: '+5511888888888' });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/profile', {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+5511888888888' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: '+5511888888888' } })
    );
  });

  it('returns 400 for invalid data', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/profile', {
      method: 'PATCH',
      body: JSON.stringify({ phone: '12' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
