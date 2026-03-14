import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    preventionPlanTemplate: { findUnique: jest.fn() },
    preventionTemplateShare: { findFirst: jest.fn() },
    preventionTemplateComment: { findMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/socket-server', () => ({
  emitPreventionEventToAll: jest.fn(),
  emitPreventionEventToUser: jest.fn(),
}));

jest.mock('@/lib/socket/events', () => ({
  SocketEvent: { COMMENT_ADDED: 'COMMENT_ADDED' },
  NotificationPriority: { MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'user@test.com' },
  params: { id: 'tpl-1' },
};

const mockTemplate = {
  id: 'tpl-1',
  templateName: 'Diabetes Care Template',
  createdBy: 'user-1',
};

const mockComment = {
  id: 'comment-1',
  content: 'Great template for T2D management',
  mentions: [],
  user: { id: 'user-1', firstName: 'Dr.', lastName: 'Smith', email: 'user@test.com', profilePictureUrl: null },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/prevention/templates/[id]/comments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns comments for template owner', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionTemplateShare.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.preventionTemplateComment.findMany as jest.Mock).mockResolvedValue([mockComment]);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/comments');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.comments).toHaveLength(1);
  });

  it('returns 404 when template not found', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/missing/comments');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });

  it('returns 403 when user has no access', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue({
      ...mockTemplate,
      createdBy: 'other-user',
    });
    (prisma.preventionTemplateShare.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/comments');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Access denied');
  });
});

describe('POST /api/prevention/templates/[id]/comments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new comment successfully', async () => {
    (prisma.preventionPlanTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
    (prisma.preventionTemplateShare.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.preventionTemplateComment.create as jest.Mock).mockResolvedValue(mockComment);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'Great template for T2D management', mentions: [] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.comment.id).toBe('comment-1');
  });

  it('returns 400 when content is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: '   ' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Comment content is required');
  });

  it('returns 400 when comment exceeds max length', async () => {
    const req = new NextRequest('http://localhost:3000/api/prevention/templates/tpl-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'x'.repeat(10001) }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('too long');
  });
});
