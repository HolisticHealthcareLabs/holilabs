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
    clinicianPreferences: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  auditView: jest.fn().mockResolvedValue(undefined),
  auditUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/prevention-notification.service', () => ({
  getPreventionNotificationService: jest.fn().mockReturnValue({
    updateNotificationPreference: jest.fn().mockResolvedValue(undefined),
  }),
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'user-1', email: 'clinician@holilabs.com', role: 'CLINICIAN' },
  params: {},
};

const mockClinicianPrefs = {
  clinicianId: 'user-1',
  emailEnabled: true,
  smsEnabled: false,
  pushEnabled: true,
  whatsappEnabled: false,
};

describe('GET /api/prevention/notifications/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.clinicianPreferences.findUnique as jest.Mock).mockResolvedValue(mockClinicianPrefs);
  });

  it('returns merged preferences for user with existing prefs', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/preferences');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.preferences).toBeDefined();
    expect(data.data.source).toBe('clinician');
  });

  it('returns default preferences when no clinician prefs found', async () => {
    (prisma.clinicianPreferences.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/preferences');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.source).toBe('default');
    expect(data.data.preferences.screeningReminder).toBeDefined();
  });

  it('includes latency metadata', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/preferences');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.meta.latencyMs).toBeDefined();
  });
});

describe('PATCH /api/prevention/notifications/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.clinicianPreferences.findUnique as jest.Mock).mockResolvedValue(mockClinicianPrefs);
    (prisma.clinicianPreferences.update as jest.Mock).mockResolvedValue(mockClinicianPrefs);
    (prisma.clinicianPreferences.create as jest.Mock).mockResolvedValue(mockClinicianPrefs);
  });

  it('updates existing preferences', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conditionDetected: { channels: { email: false, sms: true } },
      }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.clinicianPreferences.update).toHaveBeenCalled();
  });

  it('creates preferences when none exist', async () => {
    (prisma.clinicianPreferences.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screeningReminder: { enabled: false },
      }),
    });
    const res = await PATCH(req, mockContext);

    expect(res.status).toBe(200);
    expect(prisma.clinicianPreferences.create).toHaveBeenCalled();
  });

  it('returns 400 for invalid preference data', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screeningReminder: { reminderDays: [0, 99] }, // 0 fails min(1), 99 fails max(30)
      }),
    });
    const res = await PATCH(req, mockContext);

    expect(res.status).toBe(400);
  });
});
