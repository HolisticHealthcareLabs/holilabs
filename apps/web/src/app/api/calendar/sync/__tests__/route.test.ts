/**
 * POST /api/calendar/sync - Calendar sync trigger tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/calendar/sync', () => ({
  syncAllCalendars: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, _opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500 }
    )
  ),
}));

const { POST } = require('../route');
const { syncAllCalendars } = require('@/lib/calendar/sync');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const mockContext = {
  user: { id: 'user-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/calendar/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (safeErrorResponse as jest.Mock).mockImplementation((_err: any, _opts: any) =>
      new (require('next/server').NextResponse)(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500 }
      )
    );
  });

  it('syncs all calendars and returns total count', async () => {
    (syncAllCalendars as jest.Mock).mockResolvedValue({
      google: { synced: 5 },
      microsoft: { synced: 3 },
      apple: { synced: 2 },
    });

    const request = new NextRequest('http://localhost:3000/api/calendar/sync', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Synced 10 appointments');
    expect(data.results.google.synced).toBe(5);
  });

  it('handles zero synced appointments', async () => {
    (syncAllCalendars as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/calendar/sync', { method: 'POST' });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Synced 0 appointments');
  });

  it('returns 500 on sync failure', async () => {
    (syncAllCalendars as jest.Mock).mockRejectedValue(new Error('Sync failed'));

    const request = new NextRequest('http://localhost:3000/api/calendar/sync', { method: 'POST' });
    const response = await POST(request, mockContext);

    expect(response.status).toBe(500);
  });
});
