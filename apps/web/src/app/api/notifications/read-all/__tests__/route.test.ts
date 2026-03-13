import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/notifications', () => ({
  markAllNotificationsAsRead: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/demo/synthetic', () => ({
  getSyntheticNotifications: jest.fn(),
  isDemoClinician: jest.fn(),
}));

const { PUT } = require('../route');
const { markAllNotificationsAsRead } = require('@/lib/notifications');
const { isDemoClinician, getSyntheticNotifications } = require('@/lib/demo/synthetic');

const mockContext = (role = 'CLINICIAN') => ({
  user: { id: 'clinician-1', email: 'dr@clinic.com', role },
  requestId: 'req-1',
});

describe('PUT /api/notifications/read-all', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks all notifications as read for regular clinician', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (markAllNotificationsAsRead as jest.Mock).mockResolvedValue({ count: 5 });

    const req = new NextRequest('http://localhost:3000/api/notifications/read-all', {
      method: 'PUT',
    });
    const res = await PUT(req, mockContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(5);
    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('clinician-1', 'CLINICIAN');
  });

  it('returns demo count without hitting DB for demo clinician', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(true);
    (getSyntheticNotifications as jest.Mock).mockReturnValue([
      { id: 'n-1', isRead: false },
      { id: 'n-2', isRead: true },
      { id: 'n-3', isRead: false },
    ]);

    const req = new NextRequest('http://localhost:3000/api/notifications/read-all', {
      method: 'PUT',
    });
    const res = await PUT(req, mockContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(2);
    expect(markAllNotificationsAsRead).not.toHaveBeenCalled();
  });

  it('sets userType to PATIENT when role is PATIENT', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (markAllNotificationsAsRead as jest.Mock).mockResolvedValue({ count: 3 });

    const req = new NextRequest('http://localhost:3000/api/notifications/read-all', {
      method: 'PUT',
    });
    await PUT(req, mockContext('PATIENT'));

    expect(markAllNotificationsAsRead).toHaveBeenCalledWith('clinician-1', 'PATIENT');
  });

  it('returns 500 when markAllNotificationsAsRead throws', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);
    (markAllNotificationsAsRead as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost:3000/api/notifications/read-all', {
      method: 'PUT',
    });
    const res = await PUT(req, mockContext());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
