import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/queue/scheduler', () => ({
  triggerImmediateCorrectionAggregation: jest.fn(),
}));

jest.mock('@/lib/queue/queues', () => ({
  getCorrectionAggregationQueue: jest.fn(),
}));

const { POST, GET } = require('../route');
const { triggerImmediateCorrectionAggregation } = require('@/lib/queue/scheduler');
const { getCorrectionAggregationQueue } = require('@/lib/queue/queues');

const ctx = { user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' } };

const mockQueue = {
  getJobCounts: jest.fn(),
  getCompleted: jest.fn(),
  getFailed: jest.fn(),
  getActive: jest.fn(),
  getWaiting: jest.fn(),
  getRepeatableJobs: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getCorrectionAggregationQueue as jest.Mock).mockReturnValue(mockQueue);
});

describe('POST /api/admin/jobs/correction-aggregation', () => {
  it('triggers daily job and returns 202', async () => {
    (triggerImmediateCorrectionAggregation as jest.Mock).mockResolvedValue('job-123');

    const req = new NextRequest('http://localhost:3000/api/admin/jobs/correction-aggregation', {
      method: 'POST',
      body: JSON.stringify({ type: 'daily' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(202);
    expect(json.success).toBe(true);
    expect(json.data.jobId).toBe('job-123');
  });

  it('returns 400 for invalid request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/jobs/correction-aggregation', {
      method: 'POST',
      body: JSON.stringify({ type: 'unknown-type' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 400 when range type is missing dates', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/jobs/correction-aggregation', {
      method: 'POST',
      body: JSON.stringify({ type: 'range' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/startDate and endDate/i);
  });

  it('returns 500 when scheduler throws', async () => {
    (triggerImmediateCorrectionAggregation as jest.Mock).mockRejectedValue(new Error('Queue down'));

    const req = new NextRequest('http://localhost:3000/api/admin/jobs/correction-aggregation', {
      method: 'POST',
      body: JSON.stringify({ type: 'daily' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

describe('GET /api/admin/jobs/correction-aggregation', () => {
  it('returns job counts and recent jobs', async () => {
    mockQueue.getJobCounts.mockResolvedValue({ completed: 10, failed: 1, active: 0, waiting: 2, delayed: 0 });
    mockQueue.getCompleted.mockResolvedValue([{ id: 'j1', name: 'agg', data: {}, finishedOn: Date.now(), returnvalue: {} }]);
    mockQueue.getFailed.mockResolvedValue([]);
    mockQueue.getActive.mockResolvedValue([]);
    mockQueue.getWaiting.mockResolvedValue([]);
    mockQueue.getRepeatableJobs.mockResolvedValue([{ key: 'k1', name: 'daily', pattern: '0 2 * * *', next: 0 }]);

    const req = new NextRequest('http://localhost:3000/api/admin/jobs/correction-aggregation');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.counts).toBeDefined();
    expect(json.data.scheduled).toHaveLength(1);
  });

  it('returns 500 when queue throws', async () => {
    (getCorrectionAggregationQueue as jest.Mock).mockImplementation(() => {
      throw new Error('Redis connection failed');
    });

    const req = new NextRequest('http://localhost:3000/api/admin/jobs/correction-aggregation');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
