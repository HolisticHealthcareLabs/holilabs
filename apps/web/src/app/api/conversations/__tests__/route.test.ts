import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    conversation: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    patient: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/rate-limit', () => ({ checkRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

describe('GET /api/conversations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns conversation list for the user', async () => {
    const mockConv = {
      id: 'conv-1',
      patientId: 'pat-1',
      title: null,
      lastMessageAt: new Date(),
      lastMessageText: 'Hello',
      isArchived: false,
      patient: { id: 'pat-1', firstName: 'Jane', lastName: 'Doe' },
      participants: [
        { userId: 'doc-1', userType: 'CLINICIAN', displayName: 'Dr. Smith', isOnline: true, lastSeenAt: null, unreadCount: 0, isMuted: false, isPinned: false },
      ],
    };
    (prisma.conversation.findMany as jest.Mock).mockResolvedValue([mockConv]);

    const req = new NextRequest('http://localhost:3000/api/conversations');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data.conversations).toHaveLength(1);
    expect(data.data.conversations[0].patientName).toBe('Jane Doe');
  });
});

describe('POST /api/conversations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Patient ID');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ firstName: 'Dr', lastName: 'Smith' });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'nonexistent' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});
