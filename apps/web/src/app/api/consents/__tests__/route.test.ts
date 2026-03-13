/**
 * Consents API Route Tests
 *
 * GET  /api/consents?patientId={id} - List patient consents
 * POST /api/consents - Create/update consent
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/consent/expiration-checker', () => ({
  checkPatientConsentExpiration: jest.fn(),
  findExpiredConsents: jest.fn(),
  expireConsent: jest.fn(),
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
    consent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dataAccessGrant: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const {
  checkPatientConsentExpiration,
  findExpiredConsents,
  expireConsent,
} = require('@/lib/consent/expiration-checker');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/consents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkPatientConsentExpiration as jest.Mock).mockResolvedValue(false);
    (findExpiredConsents as jest.Mock).mockResolvedValue([]);
  });

  it('returns consent list for a patient', async () => {
    const mockConsents = [
      {
        id: 'consent-1',
        patientId: 'patient-1',
        type: 'GENERAL_CONSULTATION',
        isActive: true,
        signedAt: new Date('2025-01-15'),
        revokedAt: null,
        version: '1.0',
      },
    ];
    (prisma.consent.findMany as jest.Mock).mockResolvedValue(mockConsents);

    const request = new NextRequest('http://localhost:3000/api/consents?patientId=patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consents).toBeDefined();
    expect(Array.isArray(data.consents)).toBe(true);
    expect(data.consents.length).toBeGreaterThanOrEqual(1);
    const generalConsent = data.consents.find((c: any) => c.consentType?.id === 'GENERAL_CONSULTATION');
    expect(generalConsent).toBeDefined();
    expect(generalConsent.granted).toBe(true);
  });

  it('rejects missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/consents');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('patientId required');
    expect(prisma.consent.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/consents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });
  });

  it('creates new consent', async () => {
    const mockPatient = {
      id: 'patient-1',
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const mockConsent = {
      id: 'consent-new',
      patientId: 'patient-1',
      type: 'TELEHEALTH',
      isActive: true,
      signedAt: new Date(),
    };

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.consent.create as jest.Mock).mockResolvedValue(mockConsent);

    const request = new NextRequest('http://localhost:3000/api/consents', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        consentTypeId: 'TELEHEALTH',
        granted: true,
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consent).toBeDefined();
    expect(data.consent.id).toBe('consent-new');
    expect(data.consent.type).toBe('TELEHEALTH');
    expect(data.consent.isActive).toBe(true);
    expect(prisma.consent.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('updates existing consent (revocation)', async () => {
    const mockPatient = {
      id: 'patient-1',
      firstName: 'Jane',
      lastName: 'Doe',
    };
    const existingConsent = {
      id: 'consent-1',
      patientId: 'patient-1',
      type: 'TELEHEALTH',
      isActive: true,
      signedAt: new Date(),
    };
    const updatedConsent = {
      ...existingConsent,
      isActive: false,
      revokedAt: new Date(),
    };

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);
    (prisma.consent.findFirst as jest.Mock).mockResolvedValue(existingConsent);
    (prisma.consent.update as jest.Mock).mockResolvedValue(updatedConsent);

    const request = new NextRequest('http://localhost:3000/api/consents', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        consentTypeId: 'TELEHEALTH',
        granted: false,
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consent).toBeDefined();
    expect(data.consent.isActive).toBe(false);
    expect(prisma.consent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'consent-1' },
        data: expect.objectContaining({
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: 'Revoked by patient via portal',
        }),
      })
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
