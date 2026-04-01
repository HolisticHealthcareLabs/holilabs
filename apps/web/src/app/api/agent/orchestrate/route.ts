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
import type { WorkflowTemplate, WorkflowStep } from '@/lib/mcp/types';
import { preventionScreeningWorkflow } from '@/lib/mcp/workflows/prevention-workflow';
import { clinicalDecisionWorkflow } from '@/lib/mcp/workflows/cds-workflow';
import { billingPreCheckWorkflow } from '@/lib/mcp/workflows/billing-check-workflow';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Generate internal service token for trusted agent gateway requests.
 */
function generateInternalToken(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET must be set for agent token signing (CVI-006)');
  const timestamp = Math.floor(Date.now() / 60000);
  return crypto
    .createHmac('sha256', secret)
    .update(`agent-internal:${timestamp}`)
    .digest('hex');
}

// Per-tool timeout default (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * Workflow Registry
 */
const WORKFLOW_REGISTRY = new Map<string, WorkflowTemplate>([
  ['prevention-screening', preventionScreeningWorkflow],
  ['clinical-decision-support', clinicalDecisionWorkflow],
  ['billing-pre-check', billingPreCheckWorkflow],
]);

/**
 * Get workflow by ID from registry
 */
function getWorkflowById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_REGISTRY.get(id);
}

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
 * Build tool array from workflow template, respecting dependencies and parallel groups
 */
function buildToolArrayFromWorkflow(
  workflow: WorkflowTemplate,
  params: Record<string, unknown>
): ToolCall[] {
  const tools: ToolCall[] = [];
  const processedSteps = new Set<string>();

  // Helper to resolve template variables
  function resolveValue(value: any, context: Record<string, any>): any {
    if (typeof value === 'string' && value.includes('{{')) {
      const varMatch = value.match(/\{\{([^}]+)\}\}/g);
      let result = value;
      varMatch?.forEach(match => {
        const varPath = match.replace(/[{}]/g, '').trim();
        const varValue = varPath.split('.').reduce((obj, key) => obj?.[key], context);
        result = result.replace(match, String(varValue ?? ''));
      });
      return result;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).reduce((acc, [k, v]) => {
        acc[k] = resolveValue(v, context);
        return acc;
      }, {} as Record<string, any>);
    }
    return value;
  }

  // Build execution context as we process steps
  const executionContext: Record<string, any> = { ...params };

  // Process steps in dependency order
  const stepsToProcess = [...workflow.steps];
  while (stepsToProcess.length > 0) {
    const currentBatch: WorkflowStep[] = [];

    // Find all steps that have no unmet dependencies
    for (let i = stepsToProcess.length - 1; i >= 0; i--) {
      const step = stepsToProcess[i];
      const depsMetOrMissing = !step.dependsOn || step.dependsOn.every(dep => processedSteps.has(dep));

      if (depsMetOrMissing) {
        currentBatch.push(step);
        stepsToProcess.splice(i, 1);
      }
    }

    if (currentBatch.length === 0 && stepsToProcess.length > 0) {
      break;
    }

    // Add current batch to tools
    currentBatch.forEach(step => {
      const resolvedArgs = resolveValue(step.inputMapping, executionContext);
      tools.push({
        tool: step.tool,
        arguments: resolvedArgs,
        id: step.id,
      });
      processedSteps.add(step.id);
      // Mock step result for context
      executionContext[`${step.id}.result`] = { mock: true };
    });
  }

  return tools;
}

/**
 * Execute workflow by ID from registry
 */
async function executeWorkflowFromRegistry(
  workflowId: string,
  params: Record<string, unknown>,
  baseUrl: string,
  cookies: string | null,
  timeout: number
): Promise<ToolCall[]> {
  const workflow = getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  return buildToolArrayFromWorkflow(workflow, params);
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

  const { tools, mode = 'parallel', timeout = DEFAULT_TIMEOUT, workflow, params = {} } = body;

  // 3. Determine tools to execute
  let toolsToExecute: ToolCall[] = [];

  if (workflow) {
    // Workflow mode: build tool array from workflow template
    const workflowTemplate = getWorkflowById(workflow);
    if (!workflowTemplate) {
      return NextResponse.json(
        { error: `Workflow not found: ${workflow}` },
        { status: 400 }
      );
    }

    try {
      toolsToExecute = buildToolArrayFromWorkflow(workflowTemplate, params);
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to build workflow: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }
  } else if (tools && Array.isArray(tools)) {
    // Tools mode: use provided tools array
    toolsToExecute = tools;
  } else {
    return NextResponse.json(
      { error: 'Either tools array or workflow ID is required' },
      { status: 400 }
    );
  }

  // Validate tools array not empty
  if (toolsToExecute.length === 0) {
    return NextResponse.json(
      { error: 'Tools array is required and must not be empty' },
      { status: 400 }
    );
  }

  // Validate each tool has a name
  for (let i = 0; i < toolsToExecute.length; i++) {
    if (!toolsToExecute[i].tool || typeof toolsToExecute[i].tool !== 'string') {
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
    results = await executeSequential(toolsToExecute, baseUrl, cookies, timeout);
  } else {
    results = await executeParallel(toolsToExecute, baseUrl, cookies, timeout);
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

  const availableWorkflows = Array.from(WORKFLOW_REGISTRY.values()).map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    category: w.category,
    version: w.version,
  }));

  return NextResponse.json({
    description: 'Agent Orchestration API - Execute multiple tools in parallel or via pre-defined workflows',
    modes: ['parallel', 'sequential'],
    defaultTimeout: DEFAULT_TIMEOUT,
    workflows: availableWorkflows,
    usage: {
      endpoint: 'POST /api/agent/orchestrate',
      toolsMode: {
        tools: [
          { tool: 'tool-name', arguments: { key: 'value' }, id: 'optional-id' },
        ],
        mode: 'parallel | sequential',
        timeout: 30000,
      },
      workflowMode: {
        workflow: 'workflow-id',
        params: { patientId: 'patient-123' },
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
