/**
 * Tests for POST /api/prescriptions/[id]/sign
 *
 * - POST signs a prescription with PIN method
 * - POST signs a prescription with signature_pad method
 * - POST rejects missing signature fields
 * - POST returns 404 for missing prescription
 * - POST returns 403 for unauthorized clinician
 * - POST returns 400 for already-signed prescription
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    prescription: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

jest.mock('@/lib/analytics/server-analytics', () => ({
  trackEvent: jest.fn().mockResolvedValue(undefined),
  ServerAnalyticsEvents: { PRESCRIPTION_SIGNED: 'prescription_signed' },
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

const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'rx-1' },
};

const mockPrescription = {
  id: 'rx-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  status: 'PENDING',
  prescriptionHash: null,
  medications: [{ name: 'Metformin', dose: '500mg', frequency: 'BID' }],
  patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
};

const mockSignedPrescription = {
  ...mockPrescription,
  status: 'SIGNED',
  signatureMethod: 'pin',
  signedAt: new Date(),
  prescriptionHash: 'abc123hash',
  patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe', tokenId: null },
  clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', licenseNumber: 'MD123' },
};

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

describe('POST /api/prescriptions/[id]/sign', () => {
  it('signs a prescription with PIN method', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(mockPrescription);
    (prisma.prescription.update as jest.Mock).mockResolvedValue(mockSignedPrescription);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1/sign', {
      method: 'POST',
      body: JSON.stringify({
        signatureMethod: 'pin',
        signatureData: '1234',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Prescription signed successfully');
    expect(prisma.prescription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SIGNED' }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('signs a prescription with signature_pad method', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(mockPrescription);
    (prisma.prescription.update as jest.Mock).mockResolvedValue(mockSignedPrescription);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1/sign', {
      method: 'POST',
      body: JSON.stringify({
        signatureMethod: 'signature_pad',
        signatureData: 'base64-signature-data',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 when signatureMethod or signatureData is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1/sign', {
      method: 'POST',
      body: JSON.stringify({ signatureMethod: 'pin' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('signatureMethod and signatureData are required');
    expect(prisma.prescription.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when prescription not found', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-missing/sign', {
      method: 'POST',
      body: JSON.stringify({
        signatureMethod: 'pin',
        signatureData: '1234',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { ...mockContext, params: { id: 'rx-missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prescription not found');
  });

  it('returns 403 for unauthorized clinician', async () => {
    const otherPrescription = { ...mockPrescription, clinicianId: 'clinician-other' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(otherPrescription);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1/sign', {
      method: 'POST',
      body: JSON.stringify({
        signatureMethod: 'pin',
        signatureData: '1234',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('returns 400 when prescription is already signed', async () => {
    const alreadySigned = { ...mockPrescription, status: 'SIGNED' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(alreadySigned);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1/sign', {
      method: 'POST',
      body: JSON.stringify({
        signatureMethod: 'pin',
        signatureData: '1234',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Prescription is already signed');
    expect(prisma.prescription.update).not.toHaveBeenCalled();
  });
});
