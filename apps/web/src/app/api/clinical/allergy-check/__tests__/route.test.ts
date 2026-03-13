/**
 * Tests for /api/clinical/allergy-check
 *
 * - POST checks allergies and returns alerts
 * - Returns empty for no allergies
 * - Handles missing patient data
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    allergy: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/allergy-check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns empty alerts when patient has no allergies', async () => {
    (prisma.allergy.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/clinical/allergy-check', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-123',
        medications: ['Amoxicillin', 'Ibuprofen'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alerts).toEqual([]);
    expect(data.hasContraindications).toBe(false);
    expect(data.summary).toContain('No active medication allergies');
  });

  it('returns contraindication alerts when medication matches allergy', async () => {
    (prisma.allergy.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'allergy-1',
        allergen: 'Penicillin',
        severity: 'SEVERE',
        reactions: ['Rash'],
        crossReactiveWith: [],
        verificationStatus: 'CLINICIAN_VERIFIED',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/clinical/allergy-check', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-123',
        medications: ['Amoxicillin'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alerts.length).toBeGreaterThan(0);
    expect(data.hasContraindications).toBe(true);
    expect(data.alerts[0].allergen).toBe('Penicillin');
    expect(data.alerts[0].medication).toBe('Amoxicillin');
    expect(data.summary.critical).toBeGreaterThanOrEqual(0);
  });

  it('rejects missing patientId and medications', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/allergy-check', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Patient ID and medications');
  });
});

describe('GET /api/clinical/allergy-check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns patient allergies when patientId provided', async () => {
    (prisma.allergy.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', allergen: 'Penicillin', allergyType: 'MEDICATION', severity: 'SEVERE', isActive: true },
    ]);

    const request = new NextRequest('http://localhost:3000/api/clinical/allergy-check?patientId=patient-123');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.allergies).toHaveLength(1);
    expect(data.allergies[0].allergen).toBe('Penicillin');
    expect(data.count).toBe(1);
    expect(data.hasMedicationAllergies).toBe(true);
  });

  it('returns 400 when patientId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/allergy-check');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Patient ID is required');
  });
});
