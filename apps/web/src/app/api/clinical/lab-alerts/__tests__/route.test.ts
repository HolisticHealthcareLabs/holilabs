/**
 * Tests for POST /api/clinical/lab-alerts and GET /api/clinical/lab-alerts
 *
 * - POST returns critical alerts for abnormal lab values
 * - POST returns 400 when patientId is missing
 * - POST returns 403 when patient access denied
 * - GET returns alerts for recent labs from database
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
    labResult: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { verifyPatientAccess } = require('@/lib/api/middleware');
const { prisma } = require('@/lib/prisma');
const { POST, GET } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/lab-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns critical alerts for critically abnormal lab values', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/lab-alerts', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        labResults: [
          { name: 'Potassium', value: 6.8 }, // critical_high
          { name: 'Glucose', value: 30 },     // critical_low
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAbnormalities).toBe(true);
    expect(data.alerts.length).toBeGreaterThan(0);
    expect(data.summary.critical).toBeGreaterThan(0);
    expect(data.alerts[0].type).toBe('critical');
  });

  it('returns no alerts for normal lab values', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/lab-alerts', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        labResults: [
          { name: 'Sodium', value: 140 },
          { name: 'Potassium', value: 4.2 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAbnormalities).toBe(false);
    expect(data.alerts).toHaveLength(0);
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/lab-alerts', {
      method: 'POST',
      body: JSON.stringify({ labResults: [] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });

  it('returns 403 when patient access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);
    const request = new NextRequest('http://localhost:3000/api/clinical/lab-alerts', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-other' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Access denied');
  });
});

describe('GET /api/clinical/lab-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.labResult.findMany as jest.Mock).mockResolvedValue([
      { id: 'lab-1', name: 'Troponin', value: 0.1, resultDate: new Date() },
    ]);
  });

  it('fetches recent labs from DB and returns alerts', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/lab-alerts?patientId=patient-1'
    );

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAbnormalities).toBeDefined();
    expect(prisma.labResult.findMany).toHaveBeenCalled();
  });

  it('returns 400 when patientId query param is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/lab-alerts');

    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });
});
