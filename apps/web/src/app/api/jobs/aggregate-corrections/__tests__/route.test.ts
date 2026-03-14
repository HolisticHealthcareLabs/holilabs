import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/jobs/correction-aggregation', () => ({
  aggregateDailyCorrections: jest.fn(),
  aggregateCorrectionsRange: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

const { POST, GET } = require('../route');
const { aggregateDailyCorrections, aggregateCorrectionsRange } = require('@/lib/jobs/correction-aggregation');

describe('POST /api/jobs/aggregate-corrections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
    (aggregateDailyCorrections as jest.Mock).mockResolvedValue({
      processed: true,
      results: { aggregated: 15 },
    });
    (aggregateCorrectionsRange as jest.Mock).mockResolvedValue({
      processed: true,
      results: { aggregated: 5 },
    });
  });

  it('runs daily aggregation when no mode is specified', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs/aggregate-corrections', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(aggregateDailyCorrections).toHaveBeenCalled();
  });

  it('runs custom range aggregation when mode=custom with valid dates', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/jobs/aggregate-corrections?mode=custom&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z',
      { method: 'POST' }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(aggregateCorrectionsRange).toHaveBeenCalled();
    expect(data.success).toBe(true);
  });

  it('returns 401 when CRON_SECRET is set and token is missing', async () => {
    process.env.CRON_SECRET = 'my-secret';
    const req = new NextRequest('http://localhost:3000/api/jobs/aggregate-corrections', {
      method: 'POST',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when mode=custom with invalid date format', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/jobs/aggregate-corrections?mode=custom&startDate=not-a-date&endDate=also-not-a-date',
      { method: 'POST' }
    );
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid date');
  });
});

describe('GET /api/jobs/aggregate-corrections', () => {
  it('returns job metadata', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs/aggregate-corrections');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.job).toBe('correction-aggregation');
    expect(data.status).toBe('active');
  });
});
