import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    appointment: { findMany: jest.fn() },
    medication: { findMany: jest.fn() },
    labResult: { findMany: jest.fn() },
    document: { findMany: jest.fn() },
    clinicalNote: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockPatient = {
  id: 'patient-1',
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: new Date('1990-01-15'),
  gender: 'FEMALE',
  address: '123 Main St',
  city: 'Buenos Aires',
  state: 'BA',
  postalCode: '1000',
  country: 'AR',
  emergencyContactName: 'Jose',
  emergencyContactPhone: '+5511999',
  emergencyContactRelation: 'Spouse',
  patientUser: { email: 'maria@test.com', phone: '+5511999', emailVerifiedAt: new Date(), phoneVerifiedAt: null, mfaEnabled: false, createdAt: new Date() },
};

describe('GET /api/portal/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns full patient data export as JSON attachment', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.medication.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.document.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/export'), mockContext);
    const text = await res.text();
    const data = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(data.patient.firstName).toBe('Maria');
    expect(data.metadata.exportVersion).toBe('1.0.0');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/export'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('includes all data sections in export', async () => {
    const mockAppointment = {
      id: 'apt-1', title: 'Checkup', description: null,
      startTime: new Date(), endTime: new Date(),
      type: 'GENERAL', status: 'COMPLETED',
      clinician: { firstName: 'Dr', lastName: 'Test', specialty: 'GP' },
    };
    const mockMed = {
      id: 'med-1', name: 'Aspirin', genericName: 'Aspirin', dose: '100mg',
      frequency: 'Daily', instructions: 'Take with food', isActive: true,
      startDate: new Date(), endDate: null, prescribedBy: 'Dr Test', sideEffects: null,
    };

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
    (prisma.medication.findMany as jest.Mock).mockResolvedValue([mockMed]);
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.document.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/export'), mockContext);
    const text = await res.text();
    const data = JSON.parse(text);

    expect(data.appointments).toHaveLength(1);
    expect(data.medications).toHaveLength(1);
    expect(data.metadata.totalRecords).toBe(2);
  });
});
