/**
 * Agent Gateway API
 *
 * Thin passthrough that routes agent tool calls to existing API endpoints.
 * All auth, audit, and IDOR protection inherited from underlying routes.
 *
 * POST /api/agent
 * Body: { tool: string, arguments: object }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Generate internal service token for trusted agent gateway requests.
 * This allows internal requests to bypass CSRF and redundant auth checks.
 * The agent gateway ALWAYS validates user session before making internal calls.
 */
function generateInternalToken(): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  const timestamp = Math.floor(Date.now() / 60000); // 1-minute window
  return crypto
    .createHmac('sha256', secret)
    .update(`agent-internal:${timestamp}`)
    .digest('hex');
}

// Tool name -> route mapping. Add tools as agents need them.
const TOOL_ROUTES: Record<string, { method: string; path: string }> = {
  // ═══════════════════════════════════════════════════════════════════
  // PATIENT TOOLS
  // ═══════════════════════════════════════════════════════════════════
  'get-patient': { method: 'GET', path: '/api/patients/{id}' },
  'search-patients': { method: 'GET', path: '/api/patients/search' },
  'get-patient-medications': { method: 'GET', path: '/api/patients/{id}/medications' },
  'get-patient-allergies': { method: 'GET', path: '/api/patients/{id}/allergies' },
  'get-patient-diagnoses': { method: 'GET', path: '/api/patients/{id}/diagnoses' },

  // ═══════════════════════════════════════════════════════════════════
  // CLINICAL INTELLIGENCE TOOLS (Core)
  // ═══════════════════════════════════════════════════════════════════
  'diagnose-symptoms': { method: 'POST', path: '/api/clinical/diagnosis' },
  'check-drug-interactions': { method: 'POST', path: '/api/clinical/drug-interactions' },
  'check-allergies': { method: 'POST', path: '/api/clinical/allergy-check' },

  // ═══════════════════════════════════════════════════════════════════
  // CLINICAL DECISION SUPPORT
  // ═══════════════════════════════════════════════════════════════════
  'clinical-decision': { method: 'POST', path: '/api/clinical/decision' },
  'decision-support': { method: 'POST', path: '/api/clinical/decision-support' },

  // ═══════════════════════════════════════════════════════════════════
  // CLINICAL ALERTS
  // ═══════════════════════════════════════════════════════════════════
  'check-vital-alerts': { method: 'POST', path: '/api/clinical/vital-alerts' },
  'check-lab-alerts': { method: 'POST', path: '/api/clinical/lab-alerts' },
  'get-lab-alerts': { method: 'GET', path: '/api/clinical/lab-alerts' },

  // ═══════════════════════════════════════════════════════════════════
  // PREVENTIVE CARE
  // ═══════════════════════════════════════════════════════════════════
  'get-preventive-care': { method: 'GET', path: '/api/clinical/preventive-care' },
  'check-preventive-care': { method: 'POST', path: '/api/clinical/preventive-care' },
  'update-preventive-care': { method: 'PUT', path: '/api/clinical/preventive-care' },

  // ═══════════════════════════════════════════════════════════════════
  // DRUG & INTERNATIONAL STANDARDS LOOKUP
  // ═══════════════════════════════════════════════════════════════════
  'lookup-drug': { method: 'GET', path: '/api/clinical/drugs' },
  'normalize-drug': { method: 'POST', path: '/api/clinical/drugs' },
  'lookup-icd11': { method: 'GET', path: '/api/clinical/international' },
  'lookup-international': { method: 'POST', path: '/api/clinical/international' },

  // ═══════════════════════════════════════════════════════════════════
  // FORM COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════
  'send-form': { method: 'POST', path: '/api/forms/send' },
  'get-sent-forms': { method: 'GET', path: '/api/forms/sent' },
  'get-form-response': { method: 'GET', path: '/api/forms/responses/{id}' },

  // ═══════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════
  'send-reminder': { method: 'POST', path: '/api/reminders/send' },
  'get-sent-reminders': { method: 'GET', path: '/api/reminders/sent' },
  'get-reminder-stats': { method: 'GET', path: '/api/reminders/stats' },

  // ═══════════════════════════════════════════════════════════════════
  // PREVENTION WORKFLOW
  // ═══════════════════════════════════════════════════════════════════
  'get-prevention-hub': { method: 'GET', path: '/api/prevention/hub/{patientId}' },
  'process-prevention': { method: 'POST', path: '/api/prevention/process' },

  // ═══════════════════════════════════════════════════════════════════
  // GOVERNANCE TOOLS
  // ═══════════════════════════════════════════════════════════════════
  'get-governance-logs': { method: 'GET', path: '/api/governance/logs' },
  'get-governance-stats': { method: 'GET', path: '/api/governance/stats' },
};

export async function POST(request: NextRequest) {
  // 1. Verify session (agents must have valid session)
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse tool call
  let body: { tool: string; arguments?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tool, arguments: args = {} } = body;

  if (!tool || typeof tool !== 'string') {
    return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
  }

  // 3. Look up route
  const route = TOOL_ROUTES[tool];
  if (!route) {
    return NextResponse.json(
      {
        error: `Unknown tool: ${tool}`,
        availableTools: Object.keys(TOOL_ROUTES),
      },
      { status: 400 }
    );
  }

  // 4. Build target URL with path parameters
  let targetPath = route.path;
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(args)) {
    const placeholder = `{${key}}`;
    if (targetPath.includes(placeholder)) {
      // Path parameter (e.g., {id})
      targetPath = targetPath.replace(placeholder, String(value));
    } else if (route.method === 'GET') {
      // Query parameter for GET requests
      queryParams.set(key, String(value));
    }
  }

  // 5. Build full URL
  const baseUrl = request.nextUrl.origin;
  const queryString = queryParams.toString();
  const fullUrl = `${baseUrl}${targetPath}${queryString ? `?${queryString}` : ''}`;

  // 6. Forward request with session cookies + internal token
  const forwardHeaders = new Headers();
  forwardHeaders.set('Content-Type', 'application/json');

  // Forward cookies for session auth
  const cookies = request.headers.get('cookie');
  if (cookies) {
    forwardHeaders.set('cookie', cookies);
  }

  // Add internal service token (trusted internal request from agent gateway)
  // This bypasses CSRF and redundant auth since we already validated the session
  forwardHeaders.set('X-Agent-Internal-Token', generateInternalToken());
  forwardHeaders.set('X-Agent-User-Id', (session.user as any).id || '');
  forwardHeaders.set('X-Agent-User-Email', session.user.email || '');

  // 7. Make internal request
  const response = await fetch(fullUrl, {
    method: route.method,
    headers: forwardHeaders,
    body: route.method !== 'GET' ? JSON.stringify(args) : undefined,
  });

  // 8. Return response with tool metadata
  const data = await response.json();

  return NextResponse.json(
    {
      tool,
      success: response.ok,
      status: response.status,
      data,
    },
    { status: response.status }
  );
}

/**
 * GET /api/agent
 * Returns available tools for capability discovery
 */
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    tools: Object.entries(TOOL_ROUTES).map(([name, config]) => ({
      name,
      method: config.method,
      path: config.path,
    })),
  });
}
