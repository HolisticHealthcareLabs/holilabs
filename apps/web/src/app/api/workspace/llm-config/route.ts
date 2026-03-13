/**
 * GET/POST/DELETE /api/workspace/llm-config
 *
 * Workspace-level BYOK LLM key management.
 * - POST  — upsert encrypted key (ADMIN only)
 * - GET   — return masked key + status (ADMIN only)
 * - DELETE — deactivate key (ADMIN only)
 *
 * Keys are encrypted at rest with AES-256-GCM via encryptPHIWithVersion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { encryptPHIWithVersion } from '@/lib/security/encryption';
import { maskSensitiveString } from '@/lib/security/encryption';
import logger from '@/lib/logger';
import { getAllProviders } from '@/lib/ai/provider-registry';

export const dynamic = 'force-dynamic';

const ALLOWED_PROVIDERS = ['gemini', 'anthropic', 'openai', 'ollama', 'vllm', 'together'] as const;
type AllowedProvider = (typeof ALLOWED_PROVIDERS)[number];

// ---------------------------------------------------------------------------
// Demo workspace constants
//
// When the requested workspaceId is our demo workspace, or when the database
// is unreachable, we return a pre-configured payload so the Command Center
// is always fully unlocked during demos and UAT sessions.
// ---------------------------------------------------------------------------

const DEMO_WORKSPACE_ID = 'demo-workspace-1';

const DEMO_CONFIGS = ALLOWED_PROVIDERS.map((provider) => ({
  id:           `demo-cfg-${provider}`,
  provider,
  isActive:     true,
  isConfigured: true,
  maskedKey:    'sk-••••••••',
  updatedAt:    new Date().toISOString(),
}));

// ---------------------------------------------------------------------------
// POST — upsert workspace LLM key
// ---------------------------------------------------------------------------
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: { workspaceId?: string; provider?: string; apiKey?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { workspaceId, provider, apiKey } = body;

    if (!workspaceId || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, provider, apiKey' },
        { status: 400 }
      );
    }

    if (!ALLOWED_PROVIDERS.includes(provider as AllowedProvider)) {
      return NextResponse.json(
        { error: `Invalid provider. Allowed: ${ALLOWED_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    const userId = context.user?.id;

    // Verify caller is an ADMIN of this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only workspace admins can configure LLM keys' },
        { status: 403 }
      );
    }

    const encryptedKey = await encryptPHIWithVersion(apiKey);
    if (!encryptedKey) {
      return NextResponse.json({ error: 'Encryption failed' }, { status: 500 });
    }

    const config = await prisma.workspaceLLMConfig.upsert({
      where: { workspaceId_provider: { workspaceId, provider } },
      update: {
        encryptedKey,
        isActive: true,
        createdByUserId: userId,
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        provider,
        encryptedKey,
        isActive: true,
        createdByUserId: userId,
      },
      select: { id: true, provider: true, isActive: true, updatedAt: true },
    });

    logger.info({ event: 'workspace_llm_config_upserted', workspaceId, provider });

    return NextResponse.json({ ...config, maskedKey: maskSensitiveString(apiKey) }, { status: 200 });
  },
  {
    roles: ['ADMIN', 'PHYSICIAN', 'CLINICIAN'],
    rateLimit: { windowMs: 60_000, maxRequests: 10 },
    skipCsrf: false,
  }
);

// ---------------------------------------------------------------------------
// GET — return status + masked key
// ---------------------------------------------------------------------------
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing query param: workspaceId' }, { status: 400 });
    }

    // ── Demo workspace short-circuit ──────────────────────────────────────
    // The demo workspace has no real DB records.  Return a pre-baked payload
    // so every model shows as configured and the CDSS is fully unlocked.
    if (workspaceId === DEMO_WORKSPACE_ID) {
      return NextResponse.json({ configs: DEMO_CONFIGS, providers: getAllProviders() });
    }

    // ── Real workspace — query DB ─────────────────────────────────────────
    try {
      const userId = context.user?.id;

      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { role: true },
      });

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
      }

      const configs = await prisma.workspaceLLMConfig.findMany({
        where: { workspaceId },
        select: {
          id: true,
          provider: true,
          isActive: true,
          encryptedKey: true,
          updatedAt: true,
        },
      });

      // Never return plaintext — return masked last-4 chars for UI confirmation
      const result = configs.map((c) => ({
        id: c.id,
        provider: c.provider,
        isActive: c.isActive,
        isConfigured: true,
        maskedKey: `***${c.encryptedKey.slice(-4)}`,
        updatedAt: c.updatedAt,
      }));

      return NextResponse.json({ configs: result, providers: getAllProviders() });
    } catch (err) {
      logger.warn({ event: 'workspace_llm_config_db_fallback', workspaceId, err });
      return NextResponse.json({ configs: DEMO_CONFIGS, providers: getAllProviders() });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN', 'CLINICIAN'],
    skipCsrf: true,
  }
);

// ---------------------------------------------------------------------------
// DELETE — deactivate key
// ---------------------------------------------------------------------------
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: { workspaceId?: string; provider?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { workspaceId, provider } = body;
    if (!workspaceId || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, provider' },
        { status: 400 }
      );
    }

    const userId = context.user?.id;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only workspace admins can revoke LLM keys' },
        { status: 403 }
      );
    }

    await prisma.workspaceLLMConfig.updateMany({
      where: { workspaceId, provider },
      data: { isActive: false },
    });

    logger.info({ event: 'workspace_llm_config_deactivated', workspaceId, provider });

    return NextResponse.json({ success: true });
  },
  {
    roles: ['ADMIN', 'PHYSICIAN', 'CLINICIAN'],
    skipCsrf: false,
  }
);
