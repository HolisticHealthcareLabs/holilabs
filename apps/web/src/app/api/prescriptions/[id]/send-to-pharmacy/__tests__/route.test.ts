/**
 * Tests for POST /api/prescriptions/[id]/send-to-pharmacy
 *
 * - POST sends a signed prescription to a pharmacy
 * - POST rejects unsigned prescriptions
 * - POST rejects already-sent prescriptions
 * - POST returns 404 for missing prescription
 * - POST returns 403 for unauthorized clinician
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
  ServerAnalyticsEvents: { PRESCRIPTION_SENT: 'prescription_sent' },
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

const mockSignedPrescription = {
  id: 'rx-1',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  status: 'SIGNED',
  sentToPharmacy: false,
  prescriptionHash: 'hash123',
  medications: [{ name: 'Metformin', dose: '500mg' }],
  patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe', dateOfBirth: '1990-01-01', email: 'patient@example.com', phone: '+5511999999999' },
  clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', licenseNumber: 'MD123', email: 'dr@holilabs.com' },
};

const mockUpdatedPrescription = {
  ...mockSignedPrescription,
  status: 'SENT',
  sentToPharmacy: true,
  pharmacyId: 'pharmacy-1',
  patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe', tokenId: null },
  clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', licenseNumber: 'MD123' },
};

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

function createRequestWithUser(url: string, options: RequestInit = {}) {
  const req = new NextRequest(url, options as any) as any;
  req.user = mockContext.user;
  return req;
}

describe('POST /api/prescriptions/[id]/send-to-pharmacy', () => {
  it('sends a signed prescription to pharmacy', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(mockSignedPrescription);
    (prisma.prescription.update as jest.Mock).mockResolvedValue(mockUpdatedPrescription);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const request = createRequestWithUser(
      'http://localhost:3000/api/prescriptions/rx-1/send-to-pharmacy',
      {
        method: 'POST',
        body: JSON.stringify({ pharmacyId: 'pharmacy-1' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Prescription sent to pharmacy successfully');
    expect(prisma.prescription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          sentToPharmacy: true,
          pharmacyId: 'pharmacy-1',
        }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 400 when pharmacyId is missing', async () => {
    const request = createRequestWithUser(
      'http://localhost:3000/api/prescriptions/rx-1/send-to-pharmacy',
      {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('pharmacyId is required');
    expect(prisma.prescription.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when prescription not found', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequestWithUser(
      'http://localhost:3000/api/prescriptions/rx-missing/send-to-pharmacy',
      {
        method: 'POST',
        body: JSON.stringify({ pharmacyId: 'pharmacy-1' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, { ...mockContext, params: { id: 'rx-missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prescription not found');
  });

  it('returns 403 for unauthorized clinician', async () => {
    const otherPrescription = { ...mockSignedPrescription, clinicianId: 'clinician-other' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(otherPrescription);

    const request = createRequestWithUser(
      'http://localhost:3000/api/prescriptions/rx-1/send-to-pharmacy',
      {
        method: 'POST',
        body: JSON.stringify({ pharmacyId: 'pharmacy-1' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('returns 400 when prescription is not signed', async () => {
    const pendingPrescription = { ...mockSignedPrescription, status: 'PENDING' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(pendingPrescription);

    const request = createRequestWithUser(
      'http://localhost:3000/api/prescriptions/rx-1/send-to-pharmacy',
      {
        method: 'POST',
        body: JSON.stringify({ pharmacyId: 'pharmacy-1' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('must be signed');
    expect(prisma.prescription.update).not.toHaveBeenCalled();
  });

  it('returns 400 when prescription already sent to pharmacy', async () => {
    const alreadySent = { ...mockSignedPrescription, sentToPharmacy: true };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(alreadySent);

    const request = createRequestWithUser(
      'http://localhost:3000/api/prescriptions/rx-1/send-to-pharmacy',
      {
        method: 'POST',
        body: JSON.stringify({ pharmacyId: 'pharmacy-1' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already been sent');
    expect(prisma.prescription.update).not.toHaveBeenCalled();
  });
});
