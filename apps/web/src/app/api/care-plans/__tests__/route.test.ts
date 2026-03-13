import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  __esModule: true,
  safeErrorResponse: jest.fn((_error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: opts?.userMessage ?? 'Internal server error' },
      { status: 500 }
    );
  }),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    carePlan: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
};

describe('GET /api/care-plans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns care plans for a patient', async () => {
    const mockPlans = [
      { id: 'cp-1', patientId: 'patient-1', title: 'Pain Management', status: 'ACTIVE', category: 'PAIN_MANAGEMENT' },
      { id: 'cp-2', patientId: 'patient-1', title: 'Nutrition Plan', status: 'COMPLETED', category: 'NUTRITION' },
    ];
    (prisma.carePlan.findMany as jest.Mock).mockResolvedValue(mockPlans);

    const request = new NextRequest('http://localhost:3000/api/care-plans?patientId=patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(prisma.carePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: 'patient-1' } })
    );
  });

  it('rejects missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/care-plans');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('patientId');
    expect(prisma.carePlan.findMany).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    (prisma.carePlan.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));
    const { safeErrorResponse } = require('@/lib/api/safe-error-response');

    const request = new NextRequest('http://localhost:3000/api/care-plans?patientId=patient-1');
    await GET(request, mockContext);

    expect(safeErrorResponse).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ userMessage: 'Failed to fetch care plans' })
    );
  });
});

describe('POST /api/care-plans', () => {
  const validBody = {
    patientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    title: 'Pain Management Plan',
    category: 'PAIN_MANAGEMENT',
    priority: 'HIGH',
    goals: ['Reduce pain to 3/10'],
    assignedTeam: ['clyyyyyyyyyyyyyyyyyyyyyyyyy'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });
  });

  it('creates a care plan', async () => {
    const mockCreated = { id: 'cp-new', ...validBody, status: 'ACTIVE' };
    (prisma.carePlan.create as jest.Mock).mockResolvedValue(mockCreated);

    const request = new NextRequest('http://localhost:3000/api/care-plans', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('cp-new');
    expect(data.message).toContain('created successfully');
    expect(prisma.carePlan.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('rejects missing required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/care-plans', {
      method: 'POST',
      body: JSON.stringify({ title: 'Incomplete' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Validation failed');
    expect(prisma.carePlan.create).not.toHaveBeenCalled();
  });

  it('rejects invalid category', async () => {
    const request = new NextRequest('http://localhost:3000/api/care-plans', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, category: 'INVALID_CATEGORY' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Validation failed');
  });

  it('rejects empty goals array', async () => {
    const request = new NextRequest('http://localhost:3000/api/care-plans', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, goals: [] }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Validation failed');
  });
});
