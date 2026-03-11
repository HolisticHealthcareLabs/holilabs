/**
 * Tests for /api/patients/[id]/recording-consent
 *
 * - GET returns consent status
 * - POST creates recording consent
 * - DELETE revokes consent
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/consent/recording-consent', () => ({
  recordConsent: jest.fn(),
  withdrawConsent: jest.fn(),
  getConsentStatus: jest.fn(),
}));

const { GET, POST, DELETE } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { recordConsent, withdrawConsent, getConsentStatus } = require('@/lib/consent/recording-consent');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
  params: { id: 'patient-123' },
};

const mockConsentStatus = {
  requiresConsent: true,
  hasConsent: true,
  consentDate: new Date('2024-01-15'),
  consentMethod: 'In-Person',
  withdrawnAt: null,
  patientState: 'CA',
  lawReference: 'California Penal Code § 632',
};

describe('GET /api/patients/[id]/recording-consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns consent status when user has access', async () => {
    (getConsentStatus as jest.Mock).mockResolvedValue(mockConsentStatus);

    const request = new NextRequest('http://localhost:3000/api/patients/patient-123/recording-consent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.requiresConsent).toBe(true);
    expect(data.data.hasConsent).toBe(true);
    expect(data.data.consentMethod).toBe('In-Person');
    expect(data.data.patientState).toBe('CA');
    expect(data.data.lawReference).toContain('California');
    expect(verifyPatientAccess).toHaveBeenCalledWith('clinician-1', 'patient-123');
  });

  it('returns 403 when user lacks patient access', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/patients/patient-123/recording-consent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('permission');
  });
});

describe('POST /api/patients/[id]/recording-consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (recordConsent as jest.Mock).mockResolvedValue({ success: true, message: 'Recording consent successfully recorded' });
  });

  it('creates recording consent with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/patients/patient-123/recording-consent', {
      method: 'POST',
      body: JSON.stringify({
        consentMethod: 'In-Person',
        consentState: 'CA',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('successfully recorded');
    expect(recordConsent).toHaveBeenCalledWith(
      'patient-123',
      expect.objectContaining({
        consentMethod: 'In-Person',
        consentState: 'CA',
        clinicianId: 'clinician-1',
      })
    );
  });

  it('returns 400 when patient ID is missing', async () => {
    const ctxNoId = { ...mockContext, params: {} };
    const request = new NextRequest('http://localhost:3000/api/patients//recording-consent', {
      method: 'POST',
      body: JSON.stringify({ consentMethod: 'In-Person', consentState: 'CA' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, ctxNoId);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID required');
  });
});

describe('DELETE /api/patients/[id]/recording-consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (withdrawConsent as jest.Mock).mockResolvedValue({ success: true, message: 'Recording consent withdrawn successfully' });
  });

  it('revokes consent when user has access', async () => {
    const request = new NextRequest('http://localhost:3000/api/patients/patient-123/recording-consent', {
      method: 'DELETE',
    });

    const response = await DELETE(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('withdrawn');
    expect(withdrawConsent).toHaveBeenCalledWith('patient-123', 'clinician-1');
  });
});
