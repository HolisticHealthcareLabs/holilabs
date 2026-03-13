/**
 * Tests for GET/PATCH/DELETE /api/prescriptions/[id]
 *
 * - GET returns a single prescription
 * - GET returns 404 for missing prescription
 * - GET returns 403 for unauthorized clinician
 * - PATCH updates prescription status
 * - PATCH returns 404 for missing prescription
 * - DELETE soft-deletes PENDING/CANCELLED prescriptions
 * - DELETE blocks deletion of SIGNED prescriptions
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
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
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
const { GET, PATCH, DELETE } = require('../route');

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
  medications: [{ name: 'Metformin', dose: '500mg', frequency: 'BID' }],
  patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe', tokenId: null, dateOfBirth: '1990-01-01' },
  clinician: { id: 'clinician-1', firstName: 'Jane', lastName: 'Smith', licenseNumber: 'MD123', email: 'dr@holilabs.com' },
};

beforeEach(() => {
  jest.clearAllMocks();
  (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
});

describe('GET /api/prescriptions/[id]', () => {
  it('returns prescription for authorized clinician', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(mockPrescription);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('rx-1');
    expect(prisma.prescription.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rx-1' } })
    );
  });

  it('returns 404 when prescription not found', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-missing');
    const response = await GET(request, { ...mockContext, params: { id: 'rx-missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prescription not found');
  });

  it('returns 403 when clinician is not the prescriber', async () => {
    const otherClinicianPrescription = { ...mockPrescription, clinicianId: 'clinician-other' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(otherClinicianPrescription);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('returns 400 when prescription ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/prescriptions/');
    const response = await GET(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Prescription ID is required');
  });
});

describe('PATCH /api/prescriptions/[id]', () => {
  it('updates prescription successfully', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(mockPrescription);
    const updatedPrescription = { ...mockPrescription, status: 'SIGNED' };
    (prisma.prescription.update as jest.Mock).mockResolvedValue(updatedPrescription);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'SIGNED' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Prescription updated successfully');
    expect(prisma.prescription.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 404 when prescription not found', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-missing', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'SIGNED' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, { ...mockContext, params: { id: 'rx-missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prescription not found');
  });

  it('returns 403 for unauthorized clinician', async () => {
    const otherPrescription = { ...mockPrescription, clinicianId: 'clinician-other' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(otherPrescription);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'SIGNED' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });
});

describe('DELETE /api/prescriptions/[id]', () => {
  it('deletes a PENDING prescription', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(mockPrescription);
    (prisma.prescription.delete as jest.Mock).mockResolvedValue(undefined);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Prescription deleted successfully');
    expect(prisma.prescription.delete).toHaveBeenCalledWith({ where: { id: 'rx-1' } });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 404 when prescription not found', async () => {
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-missing', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { ...mockContext, params: { id: 'rx-missing' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prescription not found');
  });

  it('returns 400 when trying to delete a SIGNED prescription', async () => {
    const signedPrescription = { ...mockPrescription, status: 'SIGNED' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(signedPrescription);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot delete prescription');
    expect(prisma.prescription.delete).not.toHaveBeenCalled();
  });

  it('returns 403 for unauthorized clinician', async () => {
    const otherPrescription = { ...mockPrescription, clinicianId: 'clinician-other' };
    (prisma.prescription.findUnique as jest.Mock).mockResolvedValue(otherPrescription);

    const request = new NextRequest('http://localhost:3000/api/prescriptions/rx-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });
});
