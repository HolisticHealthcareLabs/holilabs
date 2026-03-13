import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({ createAuditLog: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ getNotifications: jest.fn() }));
jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticNotifications: jest.fn(),
  isDemoClinician: jest.fn().mockReturnValue(false),
}));

const { GET } = require('../route');
const { getNotifications } = require('@/lib/notifications');
const { isDemoClinician } = require('@/lib/demo/synthetic');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

describe('GET /api/notifications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns notifications for authenticated clinician', async () => {
    const mockNotifications = [
      { id: 'n-1', title: 'New lab result', isRead: false, createdAt: new Date() },
      { id: 'n-2', title: 'Appointment reminder', isRead: true, createdAt: new Date() },
    ];
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

    const req = new NextRequest('http://localhost:3000/api/notifications');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(getNotifications).toHaveBeenCalledWith('doc-1', 'CLINICIAN', { limit: 50, offset: 0, unreadOnly: false });
  });

  it('returns 500 when getNotifications throws', async () => {
    (getNotifications as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/notifications');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('returns demo notifications for demo clinician', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(true);
    const { getSyntheticNotifications } = require('@/lib/demo/synthetic');
    (getSyntheticNotifications as jest.Mock).mockReturnValue([
      { id: 'demo-1', title: 'Demo notification', isRead: false },
    ]);

    const req = new NextRequest('http://localhost:3000/api/notifications');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });
});
