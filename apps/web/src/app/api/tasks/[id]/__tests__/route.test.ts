import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    providerTask: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/socket-server', () => ({
  emitTaskUpdatedEvent: jest.fn(),
  emitTaskCompletedEvent: jest.fn(),
  emitTaskDismissedEvent: jest.fn(),
  emitTaskDeletedEvent: jest.fn(),
}));

const { PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com', role: 'CLINICIAN' },
  params: { id: 't-1' },
};

const mockTask = {
  id: 't-1',
  title: 'Review labs',
  category: 'LAB_REVIEW',
  priority: 'HIGH',
  status: 'PENDING',
  assignedTo: 'doc-1',
  dueDate: null,
  relatedType: null,
  relatedId: null,
};

describe('PATCH /api/tasks/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes a task', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (prisma.providerTask.update as jest.Mock).mockResolvedValue({
      ...mockTask,
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/tasks/t-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('COMPLETED');
  });

  it('dismisses a task', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (prisma.providerTask.update as jest.Mock).mockResolvedValue({
      ...mockTask,
      status: 'DISMISSED',
      dismissedAt: new Date(),
    });

    const req = new NextRequest('http://localhost:3000/api/tasks/t-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'dismiss' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.status).toBe('DISMISSED');
  });

  it('returns 404 when task not found', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/tasks/t-missing', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' }),
    });

    const res = await PATCH(req, { ...mockContext, params: { id: 't-missing' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Task not found');
  });

  it('returns 403 when non-owner non-admin tries to modify', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue({
      ...mockTask,
      assignedTo: 'other-doc',
    });

    const req = new NextRequest('http://localhost:3000/api/tasks/t-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' }),
    });

    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });
});

describe('DELETE /api/tasks/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a task owned by the user', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (prisma.providerTask.delete as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/tasks/t-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('returns 404 when task not found', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/tasks/t-missing', { method: 'DELETE' });
    const res = await DELETE(req, { ...mockContext, params: { id: 't-missing' } });

    expect(res.status).toBe(404);
  });

  it('returns 403 for non-owner non-admin', async () => {
    (prisma.providerTask.findUnique as jest.Mock).mockResolvedValue({
      ...mockTask,
      assignedTo: 'other-doc',
    });

    const req = new NextRequest('http://localhost:3000/api/tasks/t-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);

    expect(res.status).toBe(403);
  });
});
