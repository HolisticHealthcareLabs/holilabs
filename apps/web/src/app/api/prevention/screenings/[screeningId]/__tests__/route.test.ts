import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    screeningOutcome: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    preventionPlan: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  auditView: jest.fn().mockResolvedValue(undefined),
  auditUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) =>
    require('next/server').NextResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
}));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: Promise.resolve({ screeningId: 'screening-1' }),
};

const mockScreening = {
  id: 'screening-1',
  patientId: 'patient-1',
  screeningType: 'MAMMOGRAM',
  scheduledDate: new Date('2025-12-01'),
  completedDate: null,
  result: null,
  notes: null,
  followUpPlanId: null,
  patient: { id: 'patient-1', firstName: 'Jane', lastName: 'Doe' },
};

describe('GET /api/prevention/screenings/[screeningId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns screening details with computed status', async () => {
    (prisma.screeningOutcome.findUnique as jest.Mock).mockResolvedValue(mockScreening);

    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/screening-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('screening-1');
    expect(data.data.status).toBeDefined();
  });

  it('returns 404 when screening not found', async () => {
    (prisma.screeningOutcome.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/missing');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Screening not found');
  });
});

describe('PATCH /api/prevention/screenings/[screeningId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates screening result', async () => {
    (prisma.screeningOutcome.findUnique as jest.Mock).mockResolvedValue(mockScreening);
    (prisma.screeningOutcome.update as jest.Mock).mockResolvedValue({
      ...mockScreening,
      result: 'normal',
      completedDate: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/screening-1', {
      method: 'PATCH',
      body: JSON.stringify({ result: 'normal', completedDate: new Date().toISOString() }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Screening updated successfully');
  });

  it('returns 400 for invalid result value', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/screening-1', {
      method: 'PATCH',
      body: JSON.stringify({ result: 'invalid_result' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('returns 404 when screening not found on PATCH', async () => {
    (prisma.screeningOutcome.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/missing', {
      method: 'PATCH',
      body: JSON.stringify({ result: 'normal' }),
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/prevention/screenings/[screeningId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels a scheduled screening', async () => {
    (prisma.screeningOutcome.findUnique as jest.Mock).mockResolvedValue(mockScreening);
    (prisma.screeningOutcome.delete as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/screening-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Screening cancelled successfully');
  });

  it('returns 400 when trying to delete completed screening', async () => {
    (prisma.screeningOutcome.findUnique as jest.Mock).mockResolvedValue({
      ...mockScreening,
      completedDate: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/prevention/screenings/screening-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Cannot delete completed screenings');
  });
});
