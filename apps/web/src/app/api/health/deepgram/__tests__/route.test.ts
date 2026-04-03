import { NextRequest } from 'next/server';

const mockGetProjects = jest.fn();
const mockClient = { manage: { getProjects: mockGetProjects } };
const mockCreateClient = jest.fn(() => mockClient);

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any, _opts?: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

jest.mock('@deepgram/sdk', () => ({
  createClient: mockCreateClient,
}));

const { GET } = require('../route');

describe('GET /api/health/deepgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEEPGRAM_API_KEY = 'test-dg-key';
    mockCreateClient.mockReturnValue(mockClient);
    mockGetProjects.mockResolvedValue({
      result: { projects: [{ project_id: 'proj-1', name: 'Test Project' }] },
    });
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
  });

  it('returns healthy status when API key is valid', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.configured).toBe(true);
    expect(data.connected).toBe(true);
  });

  it('returns 500 when DEEPGRAM_API_KEY is not configured', async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.configured).toBe(false);
  });

  it('returns 500 when Deepgram API throws', async () => {
    mockGetProjects.mockRejectedValue(new Error('API error'));
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.connected).toBe(false);
  });

  it('includes supported languages list', async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.languages).toContain('pt');
    expect(data.languages).toContain('en');
  });
});
