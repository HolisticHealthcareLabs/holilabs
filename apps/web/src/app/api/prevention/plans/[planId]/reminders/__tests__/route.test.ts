import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlan: { findUnique: jest.fn() },
    preventiveCareReminder: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { planId: 'plan-1' },
};

const mockPlan = {
  id: 'plan-1',
  planName: 'Cardiovascular Prevention',
  patientId: 'patient-1',
  goals: [{ goal: 'Reduce blood pressure', status: 'active' }],
};

const mockReminder = {
  id: 'rem-1',
  title: 'Blood Pressure Check',
  description: 'Monthly BP check',
  screeningType: 'BLOOD_PRESSURE',
  dueDate: new Date('2025-06-01'),
  priority: 'MEDIUM',
  status: 'DUE',
  goalIndex: 0,
  guidelineSource: 'AHA',
  evidenceLevel: 'A',
  completedAt: null,
  completedBy: null,
  resultNotes: null,
  recurringInterval: null,
  nextDueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/prevention/plans/[planId]/reminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns reminders for a plan with enhanced goal info', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([mockReminder]);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/reminders');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.planId).toBe('plan-1');
    expect(data.data.reminders).toHaveLength(1);
    expect(data.data.reminders[0].id).toBe('rem-1');
    expect(data.data.reminders[0].goalInfo).toBeDefined();
    expect(data.data.summary.total).toBe(1);
  });

  it('returns 404 when plan not found', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/missing/reminders');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Prevention plan not found');
  });

  it('returns empty reminders list with correct summary', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
    (prisma.preventiveCareReminder.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/reminders');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.reminders).toHaveLength(0);
    expect(data.data.summary.total).toBe(0);
    expect(data.data.summary.due).toBe(0);
  });

  it('returns 500 on database error', async () => {
    (prisma.preventionPlan.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/prevention/plans/plan-1/reminders');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('DB error');
  });
});
