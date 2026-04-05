import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
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

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'pat-1', email: 'patient@test.com' },
  requestId: 'req-1',
  params: {},
};

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/portal/dashboard/stats');
}

describe('GET /api/portal/dashboard/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns dashboard stats for authenticated patient', async () => {
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.medication.count as jest.Mock).mockResolvedValue(2);
    (prisma.notification.count as jest.Mock).mockResolvedValue(3);
    (prisma.document.count as jest.Mock).mockResolvedValue(5);
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.formInstance.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(makeRequest(), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stats.medications.active).toBe(2);
    expect(data.stats.notifications.unread).toBe(3);
    expect(data.stats.documents.total).toBe(5);
    expect(data.stats.forms.pending).toBe(1);
  });

  it('returns correct appointment count when upcoming exist', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'apt-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        description: 'Checkup',
        status: 'SCHEDULED',
        clinician: { id: 'doc-1', firstName: 'Ana', lastName: 'García', specialty: 'GP' },
      },
    ]);
    (prisma.medication.count as jest.Mock).mockResolvedValue(0);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
    (prisma.document.count as jest.Mock).mockResolvedValue(0);
    (prisma.clinicalNote.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.formInstance.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(makeRequest(), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.upcomingAppointments.count).toBe(1);
    expect(data.stats.upcomingAppointments.next).toBeTruthy();
  });
});
