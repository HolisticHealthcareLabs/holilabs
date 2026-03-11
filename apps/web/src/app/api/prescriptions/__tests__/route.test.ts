/**
 * Tests for GET/POST /api/prescriptions
 *
 * - GET returns prescription list
 * - POST creates new prescription
 * - POST rejects missing medication data
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    prescription: { create: jest.fn(), findMany: jest.fn() },
    medication: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/auth/webauthn-token', () => ({
  verifyWebAuthnToken: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: { PRESCRIPTION_CREATED: 'prescription_created' },
}));

jest.mock('@/lib/socket-server', () => ({
  emitMedicationEvent: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((e: any) =>
    Promise.resolve(
      new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
        status: 500,
      })
    )
  ),
}));

jest.mock('@/lib/cds/engines/cds-engine', () => ({
  cdsEngine: {
    evaluate: jest.fn().mockResolvedValue({ alerts: [] }),
  },
}));

const { prisma } = require('@/lib/prisma');
const { GET, POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN', name: 'Dr. Smith' },
  requestId: 'req-1',
};

const mockPatient = {
  id: 'patient-1',
  assignedClinicianId: 'clinician-1',
};

const mockPrescription = {
  id: 'rx-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  prescriptionHash: 'hash123',
  medications: [{ name: 'Metformin', dose: '500mg', frequency: 'BID' }],
  status: 'SIGNED',
  patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe', tokenId: null },
  clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', licenseNumber: 'MD123' },
};

const mockMedication = {
  id: 'med-1',
  patientId: 'patient-1',
  name: 'Metformin',
  dose: '500mg',
  frequency: 'BID',
  isActive: true,
};

describe('GET /api/prescriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.prescription.findMany as jest.Mock).mockResolvedValue([mockPrescription]);
  });

  it('GET returns prescription list', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/prescriptions?patientId=patient-1'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe('rx-1');
    expect(prisma.prescription.findMany).toHaveBeenCalled();
  });
});

describe('POST /api/prescriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.prescription.create as jest.Mock).mockResolvedValue(mockPrescription);
    (prisma.medication.create as jest.Mock).mockResolvedValue(mockMedication);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);
  });

  it('POST creates new prescription', async () => {
    const request = new NextRequest('http://localhost:3000/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        medications: [{ name: 'Metformin', dose: '500mg', frequency: 'BID' }],
        signatureMethod: 'pin',
        signatureData: 'signed-pin-data',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBe('rx-1');
    expect(prisma.prescription.create).toHaveBeenCalled();
  });

  it('POST rejects missing medication data', async () => {
    const request = new NextRequest('http://localhost:3000/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        // medications omitted
        signatureMethod: 'pin',
        signatureData: 'signed-pin-data',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: medications');
    expect(prisma.prescription.create).not.toHaveBeenCalled();
  });
});
