import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    conversationParticipant: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    conversation: { findUnique: jest.fn(), update: jest.fn() },
    conversationMessage: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));

const { GET, PATCH, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
  params: Promise.resolve({ id: 'conv-1' }),
};

describe('GET /api/conversations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user is not a participant', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/not found|access denied/i);
  });

  it('returns conversation with paginated messages', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (prisma.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: 'conv-1',
      patientId: 'pat-1',
      title: null,
      isArchived: false,
      createdAt: new Date(),
      patient: { id: 'pat-1', firstName: 'Jane', lastName: 'Doe' },
      participants: [{ id: 'part-1', userId: 'doc-1', userType: 'CLINICIAN', displayName: 'Dr. Smith', isOnline: true, lastSeenAt: null, unreadCount: 0, isMuted: false, isPinned: false }],
    });
    (prisma.conversationMessage.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'cm-1', conversationId: 'conv-1', senderId: 'doc-1', senderType: 'CLINICIAN',
        content: 'Hello', messageType: 'TEXT', attachments: null, replyTo: null,
        deliveredAt: new Date(), isEdited: false, editedAt: null, isDeleted: false,
        createdAt: new Date(),
        readReceipts: [],
      },
    ]);
    (prisma.conversationParticipant.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.conversation.patientName).toBe('Jane Doe');
    expect(data.data.messages).toHaveLength(1);
  });
});

describe('PATCH /api/conversations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user is not a participant', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ isMuted: true }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('updates conversation settings (mute/pin)', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (prisma.conversationParticipant.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1', {
      method: 'PATCH',
      body: JSON.stringify({ isMuted: true, isPinned: false }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('DELETE /api/conversations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when user is not a participant', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });

  it('soft-deletes participant and returns success', async () => {
    (prisma.conversationParticipant.findFirst as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (prisma.conversationParticipant.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/conversations/conv-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.left).toBe(true);
  });
});
