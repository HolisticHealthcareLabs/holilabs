import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerTask: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/socket-server', () => ({
  emitTaskCreatedEvent: jest.fn(),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com', role: 'CLINICIAN' },
};

describe('GET /api/tasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns tasks with counts for today view', async () => {
    (prisma.providerTask.findMany as jest.Mock).mockResolvedValue([
      { id: 't-1', title: 'Review labs', status: 'PENDING', priority: 'HIGH' },
    ]);
    (prisma.providerTask.count as jest.Mock)
      .mockResolvedValueOnce(5)  // todayCount
      .mockResolvedValueOnce(2)  // overdueCount
      .mockResolvedValueOnce(8); // allPendingCount

    const req = new NextRequest('http://localhost:3000/api/tasks?view=today');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.counts.today).toBe(5);
    expect(data.counts.overdue).toBe(2);
  });

  it('filters by priority and category', async () => {
    (prisma.providerTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.providerTask.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/tasks?priority=URGENT&category=LAB_REVIEW&view=all');
    const res = await GET(req, mockContext);

    expect(res.status).toBe(200);
    expect(prisma.providerTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ priority: 'URGENT', category: 'LAB_REVIEW' }),
      })
    );
  });

  it('scopes tasks to authenticated user', async () => {
    (prisma.providerTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.providerTask.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/tasks');
    await GET(req, mockContext);

    expect(prisma.providerTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedTo: 'doc-1' }),
      })
    );
  });
});

describe('POST /api/tasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new task', async () => {
    (prisma.providerTask.create as jest.Mock).mockResolvedValue({
      id: 't-new',
      title: 'Call patient',
      category: 'FOLLOW_UP',
      priority: 'NORMAL',
      status: 'PENDING',
      assignedTo: 'doc-1',
      dueDate: null,
      relatedType: null,
      relatedId: null,
    });

    const req = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Call patient', category: 'FOLLOW_UP' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Call patient');
  });

  it('returns 400 for missing required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'No category' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('defaults assignedTo to the current user', async () => {
    (prisma.providerTask.create as jest.Mock).mockResolvedValue({
      id: 't-2',
      title: 'Self-assign',
      category: 'ADMIN',
      assignedTo: 'doc-1',
      priority: 'NORMAL',
      status: 'PENDING',
      dueDate: null,
      relatedType: null,
      relatedId: null,
    });

    const req = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Self-assign', category: 'ADMIN' }),
    });

    await POST(req, mockContext);

    expect(prisma.providerTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedTo: 'doc-1' }),
      })
    );
  });
});
