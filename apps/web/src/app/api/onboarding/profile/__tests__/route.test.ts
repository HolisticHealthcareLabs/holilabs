import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspace: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
  _prisma: true,
}));

jest.mock('@/lib/workspace', () => ({
  getOrCreateWorkspaceForUser: jest.fn().mockResolvedValue({ workspaceId: 'ws-1' }),
}));

const { GET, PUT } = require('../route');
const { prisma } = require('@/lib/prisma');

const ctx = { user: { id: 'doc-1', role: 'CLINICIAN' } };

describe('GET /api/onboarding/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns onboarding profile from workspace metadata', async () => {
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      metadata: {
        onboardingProfile: {
          persona: 'CLINICIAN',
          orgSize: '6-25',
          complianceCountry: 'BRAZIL',
        },
      },
    });

    const req = new NextRequest('http://localhost:3000/api/onboarding/profile');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.persona).toBe('CLINICIAN');
    expect(json.context.complianceCountry).toBe('BRAZIL');
  });

  it('returns null data when no profile exists', async () => {
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({ metadata: null });

    const req = new NextRequest('http://localhost:3000/api/onboarding/profile');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toBeNull();
    expect(json.context).toBeNull();
  });
});

describe('PUT /api/onboarding/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates workspace onboarding profile', async () => {
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({ metadata: {} });
    (prisma.workspace.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/onboarding/profile', {
      method: 'PUT',
      body: JSON.stringify({
        profile: { persona: 'CLINIC_OWNER', orgSize: '1-5' },
      }),
    });
    const res = await PUT(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(prisma.workspace.update).toHaveBeenCalled();
  });

  it('merges incoming profile with existing data', async () => {
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      metadata: { onboardingProfile: { persona: 'CLINICIAN' } },
    });
    (prisma.workspace.update as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/onboarding/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: { complianceCountry: 'BRAZIL' } }),
    });
    const res = await PUT(req, ctx);
    const json = await res.json();

    expect(json.data.persona).toBe('CLINICIAN');
    expect(json.data.complianceCountry).toBe('BRAZIL');
  });
});
