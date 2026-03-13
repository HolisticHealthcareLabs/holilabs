import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findMany: jest.fn() },
  },
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
const { isDemoClinician, getSyntheticNotifications } = require('@/lib/demo/synthetic');

const makeClinicianContext = (id = 'clinician-1', email = 'dr@clinic.com') => ({
  user: { id, email, role: 'CLINICIAN' },
  requestId: 'req-1',
});

describe('GET /api/notifications/events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns SSE stream with text/event-stream content type', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);

    const abortController = new AbortController();
    const req = new NextRequest('http://localhost:3000/api/notifications/events', {
      signal: abortController.signal,
    });

    // Abort immediately to prevent interval from running
    abortController.abort();

    const res = await GET(req, makeClinicianContext());

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('returns demo SSE stream for demo clinician', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(true);
    (getSyntheticNotifications as jest.Mock).mockReturnValue([
      { id: 'n-1', isRead: false, type: 'APPOINTMENT' },
    ]);

    const abortController = new AbortController();
    const req = new NextRequest('http://localhost:3000/api/notifications/events', {
      signal: abortController.signal,
    });

    abortController.abort();

    const res = await GET(req, makeClinicianContext('demo-001'));

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(getSyntheticNotifications).toHaveBeenCalled();
  });

  it('handles PATIENT role correctly', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);

    const abortController = new AbortController();
    const req = new NextRequest('http://localhost:3000/api/notifications/events', {
      signal: abortController.signal,
    });
    abortController.abort();

    const ctx = { user: { id: 'patient-1', email: 'p@test.com', role: 'PATIENT' }, requestId: 'r' };
    const res = await GET(req, ctx);

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('stream body is readable', async () => {
    (isDemoClinician as jest.Mock).mockReturnValue(false);

    const abortController = new AbortController();
    const req = new NextRequest('http://localhost:3000/api/notifications/events', {
      signal: abortController.signal,
    });
    abortController.abort();

    const res = await GET(req, makeClinicianContext());

    expect(res.body).not.toBeNull();
  });
});
