import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findMany: jest.fn(), count: jest.fn() },
    patient: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = { user: { id: 'doc-1', email: 'doc@test.com' } };

const mockNotifications = [
  {
    id: 'notif-1',
    recipientId: 'patient-1',
    recipientType: 'PATIENT',
    type: 'APPOINTMENT_REMINDER',
    title: 'Appointment Reminder',
    message: 'Hi Jane, your appointment is tomorrow.',
    deliveredEmail: false,
    deliveredSMS: true,
    emailSentAt: null,
    smsSentAt: new Date(),
    createdAt: new Date(),
  },
];

const mockPatients = [
  { id: 'patient-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: '+1234567890' },
];

describe('GET /api/reminders/sent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns sent reminders with patient info', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
    (prisma.notification.count as jest.Mock).mockResolvedValue(1);
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

    const req = new NextRequest('http://localhost:3000/api/reminders/sent');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].channel).toBe('SMS');
    expect(data.data[0].recipient.name).toBe('Jane Doe');
  });

  it('returns pagination metadata', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
    (prisma.notification.count as jest.Mock).mockResolvedValue(25);
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

    const req = new NextRequest('http://localhost:3000/api/reminders/sent?limit=10&offset=0');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.pagination.total).toBe(25);
    expect(data.pagination.hasMore).toBe(true);
  });

  it('filters by date range (today)', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/reminders/sent?dateRange=today');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(0);
  });

  it('returns empty list when no sent reminders', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/reminders/sent');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
  });
});
