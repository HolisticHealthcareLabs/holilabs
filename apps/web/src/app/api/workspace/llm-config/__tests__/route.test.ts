/**
 * Tests for /api/workspace/llm-config
 */

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workspaceMember: { findUnique: jest.fn() },
    workspaceLLMConfig: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/security/encryption', () => ({
  encryptPHIWithVersion: jest.fn(),
  decryptPHIWithVersion: jest.fn(),
  maskSensitiveString: jest.fn((s: string) => `${s.slice(0, 7)}***${s.slice(-4)}`),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

const { prisma } = require('@/lib/prisma');
const { encryptPHIWithVersion } = require('@/lib/security/encryption');

import { NextRequest } from 'next/server';
import { POST, GET, DELETE } from '../route';

function makeRequest(method: string, body?: unknown, search?: string): NextRequest {
  const url = `http://localhost/api/workspace/llm-config${search ?? ''}`;
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const adminMembership = { role: 'ADMIN' };
const memberMembership = { role: 'MEMBER' };

describe('POST /api/workspace/llm-config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('encrypts key and upserts config', async () => {
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(adminMembership);
    (encryptPHIWithVersion as jest.Mock).mockResolvedValue('encrypted-blob');
    (prisma.workspaceLLMConfig.upsert as jest.Mock).mockResolvedValue({
      id: 'cfg-1',
      provider: 'gemini',
      isActive: true,
      updatedAt: new Date(),
    });

    const req = makeRequest('POST', {
      workspaceId: 'ws-1',
      provider: 'gemini',
      apiKey: 'AIza-plain-key-1234',
    });
    const ctx = { user: { id: 'user-1', role: 'ADMIN' } };

    const res = await (POST as any)(req, ctx);
    expect(res.status).toBe(200);

    // Encrypted key must differ from plaintext
    const upsertCall = (prisma.workspaceLLMConfig.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.encryptedKey).toBe('encrypted-blob');
    expect(upsertCall.create.encryptedKey).not.toBe('AIza-plain-key-1234');
  });

  it('returns 403 for MEMBER role', async () => {
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(memberMembership);

    const req = makeRequest('POST', {
      workspaceId: 'ws-1',
      provider: 'gemini',
      apiKey: 'AIza-key',
    });
    const ctx = { user: { id: 'user-2', role: 'CLINICIAN' } };

    const res = await (POST as any)(req, ctx);
    expect(res.status).toBe(403);
  });

  it('returns 400 for unsupported provider', async () => {
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(adminMembership);

    const req = makeRequest('POST', {
      workspaceId: 'ws-1',
      provider: 'cohere',
      apiKey: 'key',
    });
    const ctx = { user: { id: 'user-1', role: 'ADMIN' } };

    const res = await (POST as any)(req, ctx);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/workspace/llm-config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns masked keys only', async () => {
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(adminMembership);
    (prisma.workspaceLLMConfig.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'cfg-1',
        provider: 'gemini',
        isActive: true,
        encryptedKey: 'v1:abc:def:ghijklmn',
        updatedAt: new Date(),
      },
    ]);

    const req = makeRequest('GET', undefined, '?workspaceId=ws-1');
    const ctx = { user: { id: 'user-1', role: 'ADMIN' } };

    const res = await (GET as any)(req, ctx);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.configs[0].maskedKey).toMatch(/^\*\*\*/);
    // Should NOT contain the full encryptedKey
    expect(body.configs[0].encryptedKey).toBeUndefined();
  });
});

describe('DELETE /api/workspace/llm-config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets isActive=false for admin', async () => {
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(adminMembership);
    (prisma.workspaceLLMConfig.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeRequest('DELETE', { workspaceId: 'ws-1', provider: 'gemini' });
    const ctx = { user: { id: 'user-1', role: 'ADMIN' } };

    const res = await (DELETE as any)(req, ctx);
    expect(res.status).toBe(200);

    const updateCall = (prisma.workspaceLLMConfig.updateMany as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.isActive).toBe(false);
  });

  it('returns 403 for non-admin', async () => {
    (prisma.workspaceMember.findUnique as jest.Mock).mockResolvedValue(memberMembership);

    const req = makeRequest('DELETE', { workspaceId: 'ws-1', provider: 'gemini' });
    const ctx = { user: { id: 'user-2', role: 'CLINICIAN' } };

    const res = await (DELETE as any)(req, ctx);
    expect(res.status).toBe(403);
  });
});

describe('AIProviderFactory workspace key priority', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses workspace key over env var when workspaceId provided', async () => {
    // Configure mocks already set up at top of file for this test
    (prisma.workspaceLLMConfig.findUnique as jest.Mock).mockResolvedValue({
      encryptedKey: 'v1:iv:tag:enc',
    });
    (prisma.userAPIKey as any) = { findMany: jest.fn().mockResolvedValue([]) };

    const { decryptPHIWithVersion } = require('@/lib/security/encryption');
    (decryptPHIWithVersion as jest.Mock).mockResolvedValue('workspace-api-key-xyz');

    const { AIProviderFactory } = require('@/lib/ai/factory');
    const provider = await AIProviderFactory.getProvider('user-1', 'gemini', {
      workspaceId: 'ws-1',
    });
    expect(provider).toBeDefined();
    expect(provider.constructor.name).toBe('GeminiProvider');
  });
});
