import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, POST, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@example.com' },
  requestId: 'req-1',
};

const mockPatientWithConsent = {
  id: 'patient-1',
  whatsappConsentGiven: true,
  whatsappConsentDate: new Date(),
  whatsappConsentMethod: 'Portal',
  whatsappConsentWithdrawnAt: null,
  whatsappConsentLanguage: 'es',
  medicationRemindersEnabled: true,
  appointmentRemindersEnabled: true,
  labResultsAlertsEnabled: true,
  preventiveCareAlertsEnabled: true,
  preferredContactTimeStart: '09:00',
  preferredContactTimeEnd: '18:00',
  doNotDisturbEnabled: false,
  phone: '+5511999999999',
};

describe('GET /api/portal/consent/whatsapp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns consent status for patient', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatientWithConsent);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/consent/whatsapp'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.consentGiven).toBe(true);
    expect(data.data.preferences.medicationReminders).toBe(true);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/consent/whatsapp'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('POST /api/portal/consent/whatsapp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('grants consent with valid data', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ phone: '+5511999999999' });
    (prisma.patient.update as jest.Mock).mockResolvedValue({ whatsappConsentDate: new Date() });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/consent/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        consentMethod: 'Portal',
        language: 'es',
        medicationReminders: true,
        appointmentReminders: true,
        labResultsAlerts: true,
        preventiveCareAlerts: true,
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.patient.update).toHaveBeenCalled();
  });

  it('returns 400 when patient has no phone', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ phone: null });

    const req = new NextRequest('http://localhost:3000/api/portal/consent/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        consentMethod: 'Portal',
        language: 'es',
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 for invalid consent method', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/consent/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ consentMethod: 'INVALID', language: 'es' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('DELETE /api/portal/consent/whatsapp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('withdraws consent successfully', async () => {
    (prisma.patient.update as jest.Mock).mockResolvedValue({
      whatsappConsentGiven: false,
      whatsappConsentWithdrawnAt: new Date(),
      whatsappConsentDate: new Date('2024-01-01'),
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const res = await DELETE(new NextRequest('http://localhost:3000/api/portal/consent/whatsapp', { method: 'DELETE' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.consentGiven).toBe(false);
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          whatsappConsentGiven: false,
          medicationRemindersEnabled: false,
        }),
      })
    );
  });
});
