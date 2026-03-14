import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerTask: { count: jest.fn(), findFirst: jest.fn() },
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
};

const mockNextTask = {
  id: 'task-1',
  title: 'Review lab results',
  dueDate: new Date(Date.now() + 3600000),
  priority: 'URGENT',
};

describe('GET /api/tasks/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns task statistics for authenticated user', async () => {
    (prisma.providerTask.count as jest.Mock)
      .mockResolvedValueOnce(5)   // totalPending
      .mockResolvedValueOnce(2)   // urgent
      .mockResolvedValueOnce(3)   // dueToday
      .mockResolvedValueOnce(1)   // overdue
      .mockResolvedValueOnce(1)   // inProgress
      .mockResolvedValueOnce(2);  // completedToday
    (prisma.providerTask.findFirst as jest.Mock).mockResolvedValue(mockNextTask);

    const req = new NextRequest('http://localhost:3000/api/tasks/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalPending).toBe(5);
    expect(data.data.urgent).toBe(2);
    expect(data.data.dueToday).toBe(3);
    expect(data.data.overdue).toBe(1);
    expect(data.data.inProgress).toBe(1);
    expect(data.data.completedToday).toBe(2);
  });

  it('returns next upcoming task', async () => {
    (prisma.providerTask.count as jest.Mock).mockResolvedValue(0);
    (prisma.providerTask.findFirst as jest.Mock).mockResolvedValue(mockNextTask);

    const req = new NextRequest('http://localhost:3000/api/tasks/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.nextTask).toBeDefined();
    expect(data.data.nextTask.id).toBe('task-1');
    expect(data.data.nextTask.priority).toBe('URGENT');
  });

  it('returns null for nextTask when no pending tasks exist', async () => {
    (prisma.providerTask.count as jest.Mock).mockResolvedValue(0);
    (prisma.providerTask.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/tasks/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.nextTask).toBeNull();
  });

  it('returns zeros for all stats when user has no tasks', async () => {
    (prisma.providerTask.count as jest.Mock).mockResolvedValue(0);
    (prisma.providerTask.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/tasks/stats');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.totalPending).toBe(0);
    expect(data.data.urgent).toBe(0);
  });
});
