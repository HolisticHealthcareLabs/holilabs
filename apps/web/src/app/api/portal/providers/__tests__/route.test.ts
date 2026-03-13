import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn(), update: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockClinician = {
  id: 'doc-1',
  firstName: 'Dr',
  lastName: 'Test',
  specialty: 'General',
  licenseNumber: 'L1',
  profilePictureUrl: null,
};

describe('GET /api/portal/providers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns clinician list with assigned ID', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ assignedClinicianId: 'doc-1' });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockClinician]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/providers'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.assignedClinicianId).toBe('doc-1');
    expect(data.data.clinicians).toHaveLength(1);
  });

  it('applies search query', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ assignedClinicianId: null });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new NextRequest('http://localhost:3000/api/portal/providers?q=cardio'), mockContext);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ specialty: { contains: 'cardio', mode: 'insensitive' } }),
          ]),
        }),
      })
    );
  });
});

describe('POST /api/portal/providers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('selects a clinician successfully', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'doc-1', role: 'PHYSICIAN', firstName: 'Dr', lastName: 'Test' });
    (prisma.patient.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/providers', {
      method: 'POST',
      body: JSON.stringify({ clinicianId: 'doc-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { assignedClinicianId: 'doc-1' },
      })
    );
  });

  it('returns 404 when clinician not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/providers', {
      method: 'POST',
      body: JSON.stringify({ clinicianId: 'nonexistent' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 404 when user is not a clinician role', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'PATIENT', firstName: 'Jane', lastName: 'Doe' });

    const req = new NextRequest('http://localhost:3000/api/portal/providers', {
      method: 'POST',
      body: JSON.stringify({ clinicianId: 'user-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });

  it('returns 400 for invalid payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/providers', {
      method: 'POST',
      body: JSON.stringify({ clinicianId: '' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
