/**
 * Tests for /api/clinical/vital-alerts
 *
 * - POST returns alerts for abnormal vitals
 * - POST returns no alerts for normal vitals
 * - POST returns 400 when age/vitals missing
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

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { POST } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/vital-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns critical alerts for abnormal vitals', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/vital-alerts', {
      method: 'POST',
      body: JSON.stringify({
        patientAge: 40,
        vitals: {
          heartRate: 150,
          oxygenSaturation: 85,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAbnormalities).toBe(true);
    expect(data.alerts.length).toBeGreaterThan(0);
    expect(data.ageGroup).toBe('adult');
  });

  it('returns no alerts for normal vitals', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/vital-alerts', {
      method: 'POST',
      body: JSON.stringify({
        patientAge: 35,
        vitals: {
          heartRate: 72,
          systolicBP: 120,
          diastolicBP: 80,
          temperature: 36.8,
          oxygenSaturation: 98,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAbnormalities).toBe(false);
    expect(data.alerts).toHaveLength(0);
  });

  it('returns 400 when age and vitals are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/vital-alerts', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('supports flat format with age field', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/vital-alerts', {
      method: 'POST',
      body: JSON.stringify({
        age: 70,
        heartRate: 45,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ageGroup).toBe('elderly');
    expect(data.hasAbnormalities).toBe(true);
  });
});
