import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/prevention/screening-triggers', () => ({
  generateDueScreenings: jest.fn(),
  createScreeningReminders: jest.fn(),
  autoGenerateScreeningReminders: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const {
  generateDueScreenings,
  createScreeningReminders,
  autoGenerateScreeningReminders,
} = require('@/lib/prevention/screening-triggers');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: {},
};

const mockDueScreenings = [
  {
    rule: {
      name: 'Colorectal Cancer Screening',
      screeningType: 'COLONOSCOPY',
      uspstfGrade: 'A',
      priority: 'HIGH',
      clinicalRecommendation: 'Perform colonoscopy',
      guidelineSource: 'USPSTF',
    },
    dueDate: new Date('2025-07-01'),
    overdueDays: 0,
    lastScreeningDate: null,
  },
];

describe('POST /api/prevention/screening-triggers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates screening reminders for a specific patient', async () => {
    (generateDueScreenings as jest.Mock).mockResolvedValue(mockDueScreenings);
    (createScreeningReminders as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/prevention/screening-triggers', {
      method: 'POST',
      body: JSON.stringify({ patientId: '550e8400-e29b-41d4-a716-446655440000' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.remindersCreated).toBe(1);
    expect(data.data.dueScreenings).toHaveLength(1);
  });

  it('returns 400 for invalid patientId', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/screening-triggers', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'not-a-uuid' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('returns 403 for non-admin batch generation', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'CLINICIAN' });

    const req = new NextRequest('http://localhost:3000/api/prevention/screening-triggers', {
      method: 'POST',
      body: JSON.stringify({ batch: true }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Admin access required for batch generation');
  });

  it('batch generates for admin user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
    (autoGenerateScreeningReminders as jest.Mock).mockResolvedValue({ created: 5, processed: 10 });

    const req = new NextRequest('http://localhost:3000/api/prevention/screening-triggers', {
      method: 'POST',
      body: JSON.stringify({ batch: true }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Batch screening reminders generated');
  });
});

describe('GET /api/prevention/screening-triggers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns due screenings for a patient', async () => {
    (generateDueScreenings as jest.Mock).mockResolvedValue(mockDueScreenings);

    const req = new NextRequest(
      'http://localhost:3000/api/prevention/screening-triggers?patientId=patient-1'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalDue).toBe(1);
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/screening-triggers');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('patientId query parameter required');
  });
});
