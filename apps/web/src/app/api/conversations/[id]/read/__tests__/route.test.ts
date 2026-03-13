import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    conversationParticipant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    conversationMessage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    messageReadReceipt: {
      createMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/socket-server', () => ({
  getSocketServer: jest.fn().mockReturnValue(null),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockParticipant = {
  id: 'part-1',
  conversationId: 'conv-1',
  userId: 'u1',
  userType: 'CLINICIAN',
  isActive: true,
};

const ctx = {
  user: { id: 'u1', role: 'CLINICIAN' },
  params: Promise.resolve({ id: 'conv-1' }),
};

describe('POST /api/conversations/[id]/read', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user is not a participant', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1/read', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toContain('not found or access denied');
  });

  it('returns markedCount 0 when no unread messages', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(mockParticipant);
    (prisma.conversationMessage.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1/read', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.markedCount).toBe(0);
  });

  it('creates read receipts for unread messages', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(mockParticipant);
    (prisma.conversationMessage.findMany as jest.Mock).mockResolvedValue([
      { id: 'msg-1', senderId: 'other-user', senderType: 'CLINICIAN' },
      { id: 'msg-2', senderId: 'other-user', senderType: 'CLINICIAN' },
    ]);
    (prisma.messageReadReceipt.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.conversationParticipant.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1/read', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.markedCount).toBe(2);
    expect(json.data.lastReadMsgId).toBe('msg-2');
    expect(prisma.messageReadReceipt.createMany).toHaveBeenCalled();
    expect(prisma.conversationParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unreadCount: 0 }),
      })
    );
  });

  it('respects messageId boundary when provided', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(mockParticipant);
    (prisma.conversationMessage.findFirst as jest.Mock).mockResolvedValue({
      createdAt: new Date('2025-06-15T10:00:00Z'),
    });
    (prisma.conversationMessage.findMany as jest.Mock).mockResolvedValue([
      { id: 'msg-1', senderId: 'other', senderType: 'CLINICIAN' },
    ]);
    (prisma.messageReadReceipt.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.conversationParticipant.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1/read', {
      method: 'POST',
      body: JSON.stringify({ messageId: 'msg-1' }),
    });

    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.markedCount).toBe(1);
    expect(prisma.conversationMessage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'msg-1', conversationId: 'conv-1' }),
      })
    );
  });
});
