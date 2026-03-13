import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  requestId: 'req-1',
};

const mockPatientWithClinician = {
  assignedClinicianId: 'doc-1',
  assignedClinician: {
    id: 'doc-1',
    firstName: 'Dr',
    lastName: 'Test',
    specialty: 'GP',
    profilePictureUrl: null,
  },
};

describe('GET /api/portal/messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns messages with clinician info', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatientWithClinician);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/messages'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.clinician.firstName).toBe('Dr');
    expect(data.data.messages).toEqual([]);
  });

  it('returns 400 when no clinician assigned', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: null,
    });

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/messages'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('médico asignado');
  });
});

describe('POST /api/portal/messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a message to clinician', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatientWithClinician);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello doctor, I have a question.', type: 'TEXT' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.content).toBe('Hello doctor, I have a question.');
    expect(data.data.senderId).toBe('pu-1');
    expect(data.data.receiverId).toBe('doc-1');
  });

  it('returns 400 for empty message', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify({ content: '', type: 'TEXT' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when no clinician assigned', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      assignedClinicianId: null,
    });

    const req = new NextRequest('http://localhost:3000/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello doctor', type: 'TEXT' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('médico asignado');
  });
});
