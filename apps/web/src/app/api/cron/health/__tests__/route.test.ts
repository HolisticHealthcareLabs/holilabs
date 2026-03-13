import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  ),
}));

const mockGetAllJobsHealth = jest.fn();
const mockGetJobHealth = jest.fn();
const mockGetJobHistory = jest.fn();

jest.mock('@/lib/cron/monitoring', () => ({
  CronMonitor: {
    getInstance: () => ({
      getAllJobsHealth: mockGetAllJobsHealth,
      getJobHealth: mockGetJobHealth,
      getJobHistory: mockGetJobHistory,
    }),
  },
}));

const { POST } = require('../route');

function makeGetRequest() {
  return new NextRequest('http://localhost:3000/api/cron/health');
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/cron/health', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/cron/health', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST (job details)', () => {
    it('returns details for a specific job (200)', async () => {
      const mockHealth = {
        jobName: 'screening_triggers',
        isHealthy: true,
        totalRuns: 100,
        successfulRuns: 98,
        failedRuns: 2,
        successRate: 98.0,
        consecutiveFailures: 0,
        lastRun: new Date('2025-06-01T02:00:00Z'),
        lastSuccess: new Date('2025-06-01T02:00:00Z'),
        lastFailure: null,
        averageDuration: 1500,
      };

      mockGetJobHealth.mockReturnValue(mockHealth);
      mockGetJobHistory.mockReturnValue([
        {
          executionId: 'exec-1',
          startTime: new Date('2025-06-01T02:00:00Z'),
          endTime: new Date('2025-06-01T02:00:01Z'),
          duration: 1000,
          status: 'success',
          retryCount: 0,
          error: null,
          metadata: {},
        },
      ]);

      const res = await POST(makePostRequest({ jobName: 'screening_triggers' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.job.jobName).toBe('screening_triggers');
      expect(data.job.status).toBe('healthy');
      expect(data.history).toHaveLength(1);
    });

    it('returns 400 when jobName is missing', async () => {
      const res = await POST(makePostRequest({}));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/jobName/i);
    });

    it('returns 404 when job is not found', async () => {
      mockGetJobHealth.mockReturnValue(null);

      const res = await POST(makePostRequest({ jobName: 'nonexistent_job' }));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });
  });
});
