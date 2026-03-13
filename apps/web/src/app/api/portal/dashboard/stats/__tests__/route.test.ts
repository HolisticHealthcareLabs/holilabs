import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findMany: jest.fn() },
    medication: { count: jest.fn() },
    notification: { count: jest.fn() },
    document: { count: jest.fn() },
    clinicalNote: { findMany: jest.fn() },
    formInstance: { count: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/auth/patient-session', () => ({
  requirePatientSession: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { requirePatientSession } = require('@/lib/auth/patient-session');

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/portal/dashboard/stats');
}

describe('GET /api/portal/dashboard/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns dashboard stats for authenticated patient', async () => {
    (requirePatientSession as jest.Mock).mockResolvedValue({ patientId: 'pat-1' });
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.medication.count as jest.Mock).mockResolvedValue(2);
    (prisma.notification.count as jest.Mock).mockResolvedValue(3);
    (prisma.document.count as jest.Mock).mockResolvedValue(5);
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.formInstance.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stats.medications.active).toBe(2);
    expect(data.stats.notifications.unread).toBe(3);
    expect(data.stats.documents.total).toBe(5);
    expect(data.stats.forms.pending).toBe(1);
  });

  it('returns 500 when session is invalid', async () => {
    (requirePatientSession as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
