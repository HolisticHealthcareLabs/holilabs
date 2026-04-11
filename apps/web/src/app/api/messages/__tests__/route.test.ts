import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: () => Promise.resolve(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
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
jest.mock('@/lib/socket-server', () => ({ emitNewMessage: jest.fn(), emitUnreadCountUpdate: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ notifyNewMessage: jest.fn() }));
jest.mock('@/lib/search/meilisearch', () => ({ indexMessage: jest.fn() }));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

describe('GET /api/messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns conversations for a clinician', async () => {
    const mockMsg = {
      id: 'msg-1',
      patientId: 'pat-1',
      fromUserId: 'doc-1',
      fromUserType: 'CLINICIAN',
      toUserId: 'pat-1',
      toUserType: 'PATIENT',
      body: 'Hello patient',
      readAt: null,
      createdAt: new Date(),
      patient: { firstName: 'Jane', lastName: 'Doe' },
    };
    (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMsg]);

    const req = new NextRequest('http://localhost:3000/api/messages');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data.conversations).toHaveLength(1);
    expect(data.data.conversations[0].patientName).toBe('Jane Doe');
  });
});

describe('POST /api/messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      body: JSON.stringify({ toUserId: 'pat-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('creates a message and returns it', async () => {
    const mockCreated = {
      id: 'msg-new',
      fromUserId: 'doc-1',
      fromUserType: 'CLINICIAN',
      toUserId: 'pat-1',
      toUserType: 'PATIENT',
      patientId: 'pat-1',
      body: 'Take your meds',
      subject: null,
      createdAt: new Date(),
      patient: { firstName: 'Jane', lastName: 'Doe' },
    };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ firstName: 'John', lastName: 'Smith' });
    (prisma.message.create as jest.Mock).mockResolvedValue(mockCreated);
    (prisma.message.count as jest.Mock).mockResolvedValue(1);

    const req = new NextRequest('http://localhost:3000/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        toUserId: 'pat-1',
        toUserType: 'PATIENT',
        patientId: 'pat-1',
        messageBody: 'Take your meds',
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data.message.id).toBe('msg-new');
    expect(prisma.message.create).toHaveBeenCalled();
  });
});
