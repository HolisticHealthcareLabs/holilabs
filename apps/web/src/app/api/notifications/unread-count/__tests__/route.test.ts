import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/notifications', () => ({
  getUnreadCount: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticNotifications: jest.fn(),
  isDemoClinician: jest.fn(),
}));

const { GET } = require('../route');
const { getUnreadCount } = require('@/lib/notifications');
const { isDemoClinician, getSyntheticNotifications } = require('@/lib/demo/synthetic');

const mockContext = (role = 'CLINICIAN') => ({
  user: { id: 'clinician-1', email: 'dr@clinic.com', role },
  requestId: 'req-1',
});

describe('GET /api/notifications/unread-count', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns unread count from DB for regular clinician', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (getUnreadCount as jest.Mock).mockResolvedValue(7);

    const req = new NextRequest('http://localhost:3000/api/notifications/unread-count');
    const res = await GET(req, mockContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(7);
    expect(getUnreadCount).toHaveBeenCalledWith('clinician-1', 'CLINICIAN');
  });

  it('returns demo unread count without hitting DB for demo clinician', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(true);
    (getSyntheticNotifications as jest.Mock).mockReturnValue([
      { id: 'n-1', isRead: false },
      { id: 'n-2', isRead: false },
      { id: 'n-3', isRead: true },
    ]);

    const req = new NextRequest('http://localhost:3000/api/notifications/unread-count');
    const res = await GET(req, mockContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(2);
    expect(getUnreadCount).not.toHaveBeenCalled();
  });

  it('sets userType to PATIENT when role is PATIENT', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (getUnreadCount as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/notifications/unread-count');
    await GET(req, mockContext('PATIENT'));

    expect(getUnreadCount).toHaveBeenCalledWith('clinician-1', 'PATIENT');
  });

  it('returns 500 when getUnreadCount throws', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (getUnreadCount as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/notifications/unread-count');
    const res = await GET(req, mockContext());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
