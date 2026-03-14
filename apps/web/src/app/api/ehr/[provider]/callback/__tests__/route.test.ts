import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ehr', () => ({
  exchangeCodeForToken: jest.fn(),
  EhrProviderId: {},
  EhrAuthError: class EhrAuthError extends Error {
    errorDescription?: string;
    constructor(msg: string, errorDescription?: string) {
      super(msg);
      this.name = 'EhrAuthError';
      this.errorDescription = errorDescription;
    }
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'a1' }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    oAuthState: {
      findUnique: jest.fn(),
    },
  },
}));

const { GET } = require('../route');
const { exchangeCodeForToken, EhrAuthError } = require('@/lib/ehr');
const { prisma } = require('@/lib/prisma');

const ctx = { params: { provider: 'epic' } };

const mockSession = {
  id: 'session-1',
  userId: 'clinician-1',
  patientFhirId: 'fhir-patient-123',
  refreshToken: 'refresh-tok',
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  (exchangeCodeForToken as jest.Mock).mockResolvedValue(mockSession);
  (prisma.oAuthState.findUnique as jest.Mock).mockResolvedValue({
    state: 'state-xyz',
    redirectPath: '/dashboard/settings/integrations',
  });
});

describe('GET /api/ehr/[provider]/callback', () => {
  it('exchanges code for token and redirects to success URL', async () => {
    const url = 'http://localhost:3000/api/ehr/epic/callback?code=auth-code&state=state-xyz';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('ehr_connected=epic');
    expect(location).toContain('patient_context=fhir-patient-123');
  });

  it('redirects with error when OAuth returns an error param', async () => {
    const url = 'http://localhost:3000/api/ehr/epic/callback?error=access_denied&error_description=User+denied';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('ehr_error=User+denied');
  });

  it('redirects with error when code or state is missing', async () => {
    const url = 'http://localhost:3000/api/ehr/epic/callback?code=auth-code';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('ehr_error');
  });

  it('redirects with error for an invalid provider', async () => {
    const url = 'http://localhost:3000/api/ehr/unknown/callback?code=c&state=s';
    const req = new NextRequest(url);
    const res = await GET(req, { params: { provider: 'unknown' } });

    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('ehr_error');
  });
});
