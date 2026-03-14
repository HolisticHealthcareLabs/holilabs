import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockQueue = {
  getJob: jest.fn(),
};

jest.mock('@/lib/queue/queues', () => ({
  getDocumentParseQueue: jest.fn().mockReturnValue(mockQueue),
  getSummaryGenerationQueue: jest.fn().mockReturnValue(mockQueue),
  getFhirSyncQueue: jest.fn().mockReturnValue(mockQueue),
}));

jest.mock('@/lib/queue/config', () => ({
  QueueName: {
    DOCUMENT_PARSE: 'document-parse',
    SUMMARY_GENERATION: 'summary-generation',
    FHIR_SYNC: 'fhir-sync',
  },
}));

const { GET } = require('../route');

const mockJob = {
  id: 'job-123',
  progress: 75,
  returnvalue: { pagesProcessed: 3 },
  failedReason: undefined,
  timestamp: Date.now() - 5000,
  processedOn: Date.now() - 3000,
  finishedOn: undefined,
  getState: jest.fn().mockResolvedValue('active'),
};

describe('GET /api/jobs/[jobId]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue.getJob.mockResolvedValue(null);
  });

  it('returns job status when job is found', async () => {
    mockQueue.getJob.mockResolvedValueOnce(mockJob).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/jobs/job-123/status');
    const context = { params: { jobId: 'job-123' } };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('job-123');
    expect(data.data.status).toBe('active');
    expect(data.data.progress).toBe(75);
  });

  it('returns 404 when job is not found in any queue', async () => {
    mockQueue.getJob.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/jobs/nonexistent/status');
    const context = { params: { jobId: 'nonexistent' } };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });

  it('returns 400 when jobId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs//status');
    const context = { params: {} };
    const res = await GET(req, context);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Job ID');
  });

  it('includes result for completed jobs', async () => {
    const completedJob = {
      ...mockJob,
      returnvalue: { success: true, recordsProcessed: 10 },
      finishedOn: Date.now(),
      getState: jest.fn().mockResolvedValue('completed'),
    };
    mockQueue.getJob.mockResolvedValueOnce(completedJob).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/jobs/job-done/status');
    const context = { params: { jobId: 'job-done' } };
    const res = await GET(req, context);
    const data = await res.json();

    expect(data.data.result.recordsProcessed).toBe(10);
  });
});
