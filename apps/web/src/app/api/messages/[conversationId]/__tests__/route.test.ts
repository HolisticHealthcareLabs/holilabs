import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));
jest.mock('@/lib/socket-server', () => ({
  emitReadReceipt: jest.fn(),
  emitUnreadCountUpdate: jest.fn(),
}));
jest.mock('@/lib/search/meilisearch', () => ({
  updateMessageIndex: jest.fn(),
}));

const { GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
  params: Promise.resolve({ conversationId: 'pat-1' }),
};

describe('GET /api/messages/[conversationId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated messages for a conversation', async () => {
    const mockMsg = {
      id: 'msg-1',
      patientId: 'pat-1',
      body: 'Hello doctor',
      createdAt: new Date(),
      patient: { id: 'pat-1', firstName: 'Jane', lastName: 'Doe' },
    };
    (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMsg]);
    (prisma.message.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/messages/pat-1?limit=50');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.messages).toHaveLength(1);
  });

  it('supports cursor-based pagination', async () => {
    const cursorMsg = { createdAt: new Date('2025-01-01') };
    (prisma.message.findUnique as jest.Mock).mockResolvedValue(cursorMsg);
    (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.message.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/messages/pat-1?cursor=msg-old&direction=before');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.messages).toHaveLength(0);
  });

  it('returns unread count alongside messages', async () => {
    (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.message.count as jest.Mock).mockResolvedValue(5);

    const req = new NextRequest('http://localhost:3000/api/messages/pat-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.data.unreadCount).toBe(5);
  });
});

describe('PATCH /api/messages/[conversationId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks messages as read and returns count', async () => {
    (prisma.message.findMany as jest.Mock).mockResolvedValue([
      { id: 'msg-1', fromUserId: 'pat-1', fromUserType: 'PATIENT' },
      { id: 'msg-2', fromUserId: 'pat-1', fromUserType: 'PATIENT' },
    ]);
    (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    const req = new NextRequest('http://localhost:3000/api/messages/pat-1', { method: 'PATCH' });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.messagesMarked).toBe(2);
  });
});
