jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(),
  },
}));

import { safeErrorResponse } from '../safe-error-response';

const logger = require('@/lib/logger').default;

describe('safeErrorResponse', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it('returns only userMessage in production — no stack or devMessage', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const err = new Error('DB connection failed at /var/db/pool.ts');
    const res = safeErrorResponse(err, { userMessage: 'Failed to fetch patients' });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to fetch patients');
    expect(body).not.toHaveProperty('devMessage');
    expect(body).not.toHaveProperty('stack');
  });

  it('includes devMessage and stack in development mode', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const err = new Error('Column "ssn" does not exist');
    const res = safeErrorResponse(err, { userMessage: 'Query failed' });
    const body = await res.json();

    expect(body.error).toBe('Query failed');
    expect(body.devMessage).toBe('Column "ssn" does not exist');
    expect(body.stack).toBeDefined();
  });

  it('uses custom status codes', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const res = safeErrorResponse(new Error('not found'), {
      userMessage: 'Patient not found',
      status: 404,
    });

    expect(res.status).toBe(404);
  });

  it('handles non-Error objects gracefully', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const res = safeErrorResponse('string error');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
    expect(body).not.toHaveProperty('devMessage');
  });

  it('handles non-Error objects in development without stack', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const res = safeErrorResponse({ code: 42 });
    const body = await res.json();

    expect(body.error).toBe('Internal server error');
    expect(body).not.toHaveProperty('devMessage');
    expect(body).not.toHaveProperty('stack');
  });

  it('defaults to 500 and generic message', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const res = safeErrorResponse(new Error('oops'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });

  it('always logs full error server-side', () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const err = new Error('secret DB path /var/db');
    safeErrorResponse(err, { logContext: { route: '/api/patients' } });

    expect(logger.error).toHaveBeenCalledWith(
      '[API Error]',
      expect.objectContaining({
        message: 'secret DB path /var/db',
        stack: expect.any(String),
        route: '/api/patients',
      })
    );
  });
});
