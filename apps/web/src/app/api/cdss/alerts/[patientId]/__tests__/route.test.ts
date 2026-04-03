/**
 * Tests for GET /api/cdss/alerts/[patientId]
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  requirePatientAccess: () => jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));

const mockGetActionableAlerts = jest.fn();
jest.mock('@/lib/services/prevention.service', () => ({
  createPreventionService: jest.fn(() => ({
    getActionableAlerts: mockGetActionableAlerts,
  })),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/clinical/safety-envelope', () => ({
  wrapInSafetyEnvelope: jest.fn((data, meta) => ({ data, safetyMetadata: meta })),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { wrapInSafetyEnvelope } = require('@/lib/clinical/safety-envelope');
const { createAuditLog } = require('@/lib/audit');
const { createPreventionService } = require('@/lib/services/prevention.service');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { patientId: 'patient-1' },
};

describe('GET /api/cdss/alerts/[patientId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createPreventionService as jest.Mock).mockReturnValue({
      getActionableAlerts: mockGetActionableAlerts,
    });
    (wrapInSafetyEnvelope as jest.Mock).mockImplementation((data: any, meta: any) => ({ data, safetyMetadata: meta }));
    (createAuditLog as jest.Mock).mockResolvedValue({ id: 'audit-1' });
  });

  it('returns alerts for patient (200)', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    const mockAlerts = [{ severity: 'critical', message: 'Drug interaction' }];
    mockGetActionableAlerts.mockResolvedValue(mockAlerts);

    const request = new NextRequest('http://localhost:3000/api/cdss/alerts/patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 when patient ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/cdss/alerts/');
    const response = await GET(request, { ...mockContext, params: {} });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/cdss/alerts/nonexistent');
    const response = await GET(request, { ...mockContext, params: { patientId: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
