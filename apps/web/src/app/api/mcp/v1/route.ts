export const dynamic = "force-dynamic";
/**
 * MCP v1 API Route — Streamable HTTP Transport
 *
 * Exposes HoliLabs' 70+ MCP tools via JSON-RPC 2.0 over Streamable HTTP.
 * Supports tools/list discovery, tool execution, and SSE streaming.
 *
 * Auth: JWT Bearer token or NextAuth session.
 * Rate limit: per-client, configurable.
 * CORS: configurable allowlist for external MCP clients.
 *
 * CVI-001: Protected via auth check (JWT or session).
 * CVI-002: Tenant isolation via clinicId in auth context.
 * RVI-003: External clients get de-identified responses.
 */

import { NextRequest } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { getOrCreateMCPServer } from '@/lib/mcp/facade/mcp-server';
import { auth } from '@/lib/auth/auth';
import { logger } from '@/lib/logger';
import { redactObject } from '@/lib/security/redact-phi';
import crypto from 'crypto';

// =============================================================================
// CORS
// =============================================================================

const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// =============================================================================
// AUTH
// =============================================================================

interface AuthResult {
  userId: string;
  roles: string[];
  clinicId?: string;
  sessionId: string;
  isExternal: boolean;
}

async function authenticateRequest(request: NextRequest): Promise<AuthResult | null> {
  // 1. Try JWT Bearer token (external MCP clients)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      if (payload.sub) {
        return {
          userId: payload.sub,
          roles: (payload.roles as string[]) ?? ['AGENT'],
          clinicId: payload.clinicId as string | undefined,
          sessionId: crypto.randomUUID(),
          isExternal: true,
        };
      }
    } catch {
      // JWT invalid — fall through to session auth
    }
  }

  // 2. Try NextAuth session (internal clients / browser)
  const session = await auth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      roles: (session.user as Record<string, unknown>).roles as string[] ?? ['CLINICIAN'],
      clinicId: (session.user as Record<string, unknown>).clinicId as string | undefined,
      sessionId: crypto.randomUUID(),
      isExternal: false,
    };
  }

  return null;
}

// =============================================================================
// RATE LIMITING (simple in-memory — use Redis in production multi-replica)
// =============================================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.MCP_RATE_LIMIT_PER_MINUTE ?? '120');

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// =============================================================================
// TRANSPORT MANAGEMENT
// =============================================================================

const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

function getOrCreateTransport(sessionId: string | null): WebStandardStreamableHTTPServerTransport {
  if (sessionId && transports.has(sessionId)) {
    return transports.get(sessionId)!;
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
      logger.info(redactObject({ event: 'mcp_session_started', sessionId: id }));
    },
  });

  // Connect to MCP server
  const server = getOrCreateMCPServer();
  server.connect(transport).catch((err) => {
    logger.error(redactObject({
      event: 'mcp_transport_connect_error',
      error: err instanceof Error ? err.message : 'Unknown',
    }));
  });

  return transport;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin');

  // Auth
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  // Rate limit
  if (!checkRateLimit(authResult.userId)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  // Get or create transport for this session
  const sessionId = request.headers.get('mcp-session-id');
  const transport = getOrCreateTransport(sessionId);

  // Inject auth context into the request for tool handlers
  const enrichedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  try {
    const response = await transport.handleRequest(enrichedRequest, {
      authInfo: {
        userId: authResult.userId,
        roles: authResult.roles,
        clinicId: authResult.clinicId,
        sessionId: authResult.sessionId,
        isExternalClient: authResult.isExternal,
      } as Record<string, unknown>,
    } as Record<string, unknown>);

    // Add CORS headers
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    logger.error(redactObject({
      event: 'mcp_route_error',
      error: error instanceof Error ? error.message : 'Unknown',
    }));

    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' } }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } },
    );
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin');

  // Auth required for SSE connections too
  const authResult = await authenticateRequest(request);
  if (!authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  const sessionId = request.headers.get('mcp-session-id');
  if (!sessionId || !transports.has(sessionId)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing session' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  const transport = transports.get(sessionId)!;

  try {
    const response = await transport.handleRequest(request as unknown as Request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    logger.error(redactObject({
      event: 'mcp_sse_error',
      error: error instanceof Error ? error.message : 'Unknown',
    }));
    return new Response('SSE error', { status: 500, headers: corsHeaders(origin) });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin');
  const sessionId = request.headers.get('mcp-session-id');

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.close();
    transports.delete(sessionId);
    logger.info(redactObject({ event: 'mcp_session_closed', sessionId }));
  }

  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function OPTIONS(request: NextRequest): Promise<Response> {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
