/**
 * Agent Orchestration API
 *
 * Execute multiple tools in parallel for fast product enhancement workflows.
 * Enables batch operations with unified response and timing metrics.
 *
 * POST /api/agent/orchestrate
 * Body: {
 *   tools: Array<{ tool: string; arguments: object; id?: string }>
 *   mode?: 'parallel' | 'sequential'  // default: parallel
 *   timeout?: number  // per-tool timeout in ms, default: 30000
 *   workflow?: string  // optional pre-defined workflow name
 *   params?: object    // parameters for pre-defined workflow
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Generate internal service token for trusted agent gateway requests.
 */
function generateInternalToken(): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  const timestamp = Math.floor(Date.now() / 60000);
  return crypto
    .createHmac('sha256', secret)
    .update(`agent-internal:${timestamp}`)
    .digest('hex');
}

// Per-tool timeout default (30 seconds)
const DEFAULT_TIMEOUT = 30000;

interface ToolCall {
  tool: string;
  arguments?: Record<string, unknown>;
  id?: string;
}

interface ToolResult {
  id: string;
  tool: string;
  success: boolean;
  status: number;
  data: unknown;
  duration: number;
  error?: string;
}

/**
 * Execute a single tool call with timeout
 */
async function executeToolWithTimeout(
  toolCall: ToolCall,
  baseUrl: string,
  cookies: string | null,
  timeout: number
): Promise<ToolResult> {
  const startTime = Date.now();
  const id = toolCall.id || `tool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body: JSON.stringify({
        tool: toolCall.tool,
        arguments: toolCall.arguments || {},
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      id,
      tool: toolCall.tool,
      success: response.ok,
      status: response.status,
      data,
      duration,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    const isTimeout = error instanceof Error && error.name === 'AbortError';

    return {
      id,
      tool: toolCall.tool,
      success: false,
      status: isTimeout ? 408 : 500,
      data: null,
      duration,
      error: isTimeout ? 'Tool execution timed out' : (error instanceof Error ? error.message : 'Unknown error'),
    };
  }
}

/**
 * Execute tools in parallel (Promise.all)
 */
async function executeParallel(
  tools: ToolCall[],
  baseUrl: string,
  cookies: string | null,
  timeout: number
): Promise<ToolResult[]> {
  return Promise.all(
    tools.map((tool) => executeToolWithTimeout(tool, baseUrl, cookies, timeout))
  );
}

/**
 * Execute tools sequentially (one after another)
 */
async function executeSequential(
  tools: ToolCall[],
  baseUrl: string,
  cookies: string | null,
  timeout: number
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const tool of tools) {
    const result = await executeToolWithTimeout(tool, baseUrl, cookies, timeout);
    results.push(result);

    // Stop on first failure if sequential mode
    if (!result.success) {
      // Mark remaining tools as skipped
      const remaining = tools.slice(results.length);
      for (const skipped of remaining) {
        results.push({
          id: skipped.id || `skipped-${Date.now()}`,
          tool: skipped.tool,
          success: false,
          status: 0,
          data: null,
          duration: 0,
          error: 'Skipped due to previous tool failure',
        });
      }
      break;
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  const orchestrationStart = Date.now();

  // 1. Verify session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse request
  let body: {
    tools?: ToolCall[];
    mode?: 'parallel' | 'sequential';
    timeout?: number;
    workflow?: string;
    params?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tools, mode = 'parallel', timeout = DEFAULT_TIMEOUT } = body;

  // 3. Validate tools array
  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return NextResponse.json(
      { error: 'Tools array is required and must not be empty' },
      { status: 400 }
    );
  }

  // Validate each tool has a name
  for (let i = 0; i < tools.length; i++) {
    if (!tools[i].tool || typeof tools[i].tool !== 'string') {
      return NextResponse.json(
        { error: `Tool at index ${i} missing required 'tool' field` },
        { status: 400 }
      );
    }
  }

  // 4. Extract request context
  const baseUrl = request.nextUrl.origin;
  const cookies = request.headers.get('cookie');

  // 5. Execute tools based on mode
  let results: ToolResult[];

  if (mode === 'sequential') {
    results = await executeSequential(tools, baseUrl, cookies, timeout);
  } else {
    results = await executeParallel(tools, baseUrl, cookies, timeout);
  }

  // 6. Calculate summary metrics
  const totalDuration = Date.now() - orchestrationStart;
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;
  const toolDurationSum = results.reduce((sum, r) => sum + r.duration, 0);

  // 7. Return aggregated response
  return NextResponse.json({
    mode,
    totalTools: results.length,
    success: failureCount === 0,
    results,
    metrics: {
      totalDuration,
      toolDurationSum,
      parallelSpeedup: mode === 'parallel' ? (toolDurationSum / totalDuration).toFixed(2) : '1.00',
      successCount,
      failureCount,
    },
  });
}

/**
 * GET /api/agent/orchestrate
 * Returns orchestration capabilities and available workflows
 */
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    description: 'Agent Orchestration API - Execute multiple tools in parallel',
    modes: ['parallel', 'sequential'],
    defaultTimeout: DEFAULT_TIMEOUT,
    usage: {
      endpoint: 'POST /api/agent/orchestrate',
      body: {
        tools: [
          { tool: 'tool-name', arguments: { key: 'value' }, id: 'optional-id' },
        ],
        mode: 'parallel | sequential',
        timeout: 30000,
      },
    },
    example: {
      tools: [
        { tool: 'get-patient', arguments: { id: 'patient-123' } },
        { tool: 'check-vital-alerts', arguments: { patientId: 'patient-123' } },
        { tool: 'get-preventive-care', arguments: { patientId: 'patient-123' } },
      ],
      mode: 'parallel',
    },
  });
}
