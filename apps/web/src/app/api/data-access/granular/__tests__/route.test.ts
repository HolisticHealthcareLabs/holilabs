/**
 * Tests for /api/data-access/granular
 *
 * - POST creates granular access grant
 * - POST returns 400 for missing fields
 * - GET lists grants for patient
 * - DELETE revokes a grant
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    dataAccessGrant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn().mockResolvedValue(undefined) },
  },
}));

const { POST, GET, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/data-access/granular', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('creates granular access grant', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.dataAccessGrant.create as jest.Mock).mockResolvedValue({
      id: 'grant-1',
      resourceType: 'LAB_RESULT',
      grantedAt: new Date(),
      expiresAt: null,
    });

    const request = new NextRequest('http://localhost:3000/api/data-access/granular', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        grantedToId: 'user-2',
        resourceTypes: ['LAB_RESULT'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.grants).toHaveLength(1);
  });

  it('returns 400 when patientId or resourceTypes missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/data-access/granular', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('resourceTypes');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/data-access/granular', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'nonexistent',
        grantedToId: 'user-2',
        resourceTypes: ['LAB_RESULT'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Patient not found');
  });
});

describe('GET /api/data-access/granular', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 400 when patientId missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/data-access/granular');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId');
  });
});

describe('DELETE /api/data-access/granular', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('revokes a grant successfully', async () => {
    (prisma.dataAccessGrant.findUnique as jest.Mock).mockResolvedValue({
      id: 'grant-1',
      patientId: 'patient-1',
      resourceType: 'LAB_RESULT',
    });
    (prisma.dataAccessGrant.update as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/data-access/granular?grantId=grant-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
