import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findUnique: jest.fn() },
    preventiveCareReminder: { findMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/socket-server', () => ({
  emitPreventionEventToAll: jest.fn(),
}));

jest.mock('@/lib/socket/events', () => ({
  SocketEvent: { REMINDER_CREATED: 'REMINDER_CREATED' },
  NotificationPriority: { MEDIUM: 'MEDIUM' },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { planId: 'plan-1' },
};

const mockPlan = {
  id: 'plan-1',
  planName: 'Diabetes Prevention',
  patientId: 'patient-1',
  guidelineSource: 'ADA',
  evidenceLevel: 'A',
  goals: [
    { goal: 'Reduce HbA1c', status: 'active', priority: 'HIGH', category: 'diabetes' },
    { goal: 'Exercise 3x/week', status: 'active', timeframe: '3 months' },
  ],
  patient: { id: 'patient-1', firstName: 'Jane', lastName: 'Doe' },
};

const mockCreatedReminder = {
  id: 'rem-new',
  patientId: 'patient-1',
  preventionPlanId: 'plan-1',
  goalIndex: 0,
  title: 'Reduce HbA1c',
  dueDate: new Date('2025-07-01'),
};

describe('POST /api/prevention/plans/[planId]/reminders/auto-generate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('auto-generates reminders for new goals', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.preventiveCareReminder.create as jest.Mock).mockResolvedValue(mockCreatedReminder);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/reminders/auto-generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.totalGoals).toBe(2);
    expect(data.data.summary.remindersCreated).toBeGreaterThan(0);
  });

  it('returns 404 when plan not found', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/missing/reminders/auto-generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Prevention plan not found');
  });

  it('returns 400 when plan has no goals', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue({ ...mockPlan, goals: [] });

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/reminders/auto-generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('No goals found in prevention plan');
  });

  it('skips goals with existing reminders and completed goals', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue({
      ...mockPlan,
      goals: [
        { goal: 'Reduce HbA1c', status: 'active' },
        { goal: 'Completed goal', status: 'completed' },
      ],
    });
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([
      { goalIndex: 0 }, // existing reminder for goal 0
    ]);
    (prisma.preventiveCareReminder.create as jest.Mock).mockResolvedValue(mockCreatedReminder);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/reminders/auto-generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.summary.goalsSkipped).toBe(2);
    expect(data.data.summary.remindersCreated).toBe(0);
  });
});
