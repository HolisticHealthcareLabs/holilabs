/**
 * Tests for POST /api/consent/recording
 *
 * - POST records verbal consent for a patient the clinician has access to
 * - POST returns 400 when patientId is missing
 * - POST returns 404 when patient not found or clinician lacks access
 * - POST returns 500 when recordConsent fails
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
    patient: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/consent/recording-consent', () => ({
  recordConsent: jest.fn(),
}));

const { verifyPatientAccess } = require('@/lib/api/middleware');
const { prisma } = require('@/lib/prisma');
const { recordConsent } = require('@/lib/consent/recording-consent');
const { POST } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/consent/recording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      state: 'CONSENTED',
    });
    (recordConsent as jest.Mock).mockResolvedValue({ success: true, message: 'Consent recorded' });
  });

  it('records verbal consent for a patient the clinician owns', async () => {
    const request = new NextRequest('http://localhost:3000/api/consent/recording', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(recordConsent).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({
        consentMethod: 'Verbal',
        clinicianId: 'clinician-1',
      })
    );
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/consent/recording', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('patientId is required');
  });

  it('returns 404 when patient is not found or clinician lacks access', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/consent/recording', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-other' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns 500 when recordConsent fails', async () => {
    (recordConsent as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Database write failed',
    });

    const request = new NextRequest('http://localhost:3000/api/consent/recording', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Database write failed');
  });
});
