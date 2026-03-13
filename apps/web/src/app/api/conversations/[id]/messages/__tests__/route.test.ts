import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    patient: { findUnique: jest.fn() },
    conversationParticipant: { findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    conversationMessage: { create: jest.fn(), findFirst: jest.fn() },
    conversation: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));
jest.mock('@/lib/socket-server', () => ({ getSocketServer: jest.fn().mockReturnValue(null) }));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
  params: Promise.resolve({ id: 'conv-1' }),
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/conversations/conv-1/messages', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/conversations/[id]/messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when content is empty', async () => {
    const res = await POST(makeRequest({ content: '' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/content|attachments/i);
  });

  it('returns 404 when sender is not a participant', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ firstName: 'Dr', lastName: 'Smith' });
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ content: 'Hello' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found|access denied/i);
  });

  it('creates a message and returns it', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ firstName: 'Ana', lastName: 'Garcia' });
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({ id: 'part-1' });

    const createdMsg = {
      id: 'cm-new',
      conversationId: 'conv-1',
      senderId: 'doc-1',
      senderType: 'CLINICIAN',
      content: 'Take your medication',
      messageType: 'TEXT',
      attachments: null,
      replyTo: null,
      deliveredAt: new Date(),
      createdAt: new Date(),
    };
    (prisma.$transaction as jest.Mock).mockResolvedValue([createdMsg, {}]);
    (prisma.conversationParticipant.updateMany as jest.Mock).mockResolvedValue({});
    (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue([]);

    const res = await POST(makeRequest({ content: 'Take your medication' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message.content).toBe('Take your medication');
  });

  it('returns 400 when replyToId references a non-existent message', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ firstName: 'Ana', lastName: 'Garcia' });
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (prisma.conversationMessage.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ content: 'Reply', replyToId: 'msg-nonexistent' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/reply.*not found/i);
  });
});
