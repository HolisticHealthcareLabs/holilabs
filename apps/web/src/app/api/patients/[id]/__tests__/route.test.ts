/**
 * Patients API Tests - Individual Operations (GET, PUT, DELETE)
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: jest.fn(() => 'mock-hash-xyz'),
}));

jest.mock('@/lib/audit', () => ({
  auditView: jest.fn(() => Promise.resolve()),
  auditUpdate: jest.fn(() => Promise.resolve()),
  auditDelete: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/cache/patient-context-cache', () => ({
  onPatientUpdated: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticPatients: jest.fn(() => []),
  isDemoClinician: jest.fn(() => false),
}));

const { GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { isDemoClinician } = require('@/lib/demo/synthetic');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'patient-123' },
};

const mockPatient = {
  id: 'patient-123',
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: new Date('1990-01-15'),
  gender: 'F',
  email: 'maria@example.com',
  phone: '+5511999999999',
  address: null,
  mrn: 'MRN-001',
  externalMrn: null,
  assignedClinicianId: 'clinician-1',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  assignedClinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test', email: 'dr@holilabs.com', specialty: 'GP', licenseNumber: null },
  medications: [],
  appointments: [],
  consents: [],
  documents: [],
  clinicalNotes: [],
  prescriptions: [],
};

describe('GET /api/patients/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns patient by ID', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);

    const request = new NextRequest(
      'http://localhost:3000/api/patients/patient-123?accessReason=DIRECT_PATIENT_CARE'
    );
    const response = await GET(request, { ...mockContext, params: { id: 'patient-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('patient-123');
    expect(data.data.firstName).toBe('Maria');
    expect(data.data.lastName).toBe('Silva');
  });

  it('returns 404 for non-existent patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/patients/nonexistent?accessReason=DIRECT_PATIENT_CARE'
    );
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });
});

describe('PUT /api/patients/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('updates patient fields', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.patient.update as jest.Mock).mockResolvedValue({
      ...mockPatient,
      firstName: 'Maria Updated',
      lastName: 'Silva Santos',
    });

    const request = new NextRequest('http://localhost:3000/api/patients/patient-123', {
      method: 'PUT',
      body: JSON.stringify({
        firstName: 'Maria Updated',
        lastName: 'Silva Santos',
      }),
    });

    const response = await PUT(request, { ...mockContext, params: { id: 'patient-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.firstName).toBe('Maria Updated');
    expect(data.data.lastName).toBe('Silva Santos');
    expect(data.message).toBe('Patient updated successfully');
  });
});

describe('DELETE /api/patients/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('soft-deletes patient (sets isActive false)', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.patient.update as jest.Mock).mockResolvedValue({
      ...mockPatient,
      isActive: false,
    });

    const request = new NextRequest('http://localhost:3000/api/patients/patient-123', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { ...mockContext, params: { id: 'patient-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Patient deactivated successfully');
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { id: 'patient-123' },
      data: { isActive: false },
    });
  });
});
