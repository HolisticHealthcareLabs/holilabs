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
  // PATIENT TOOLS (Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'list-patients': { method: 'GET', path: '/api/patients' },
  'create-patient': { method: 'POST', path: '/api/patients' },
  'get-patient': { method: 'GET', path: '/api/patients/{id}' },
  'update-patient': { method: 'PUT', path: '/api/patients/{id}' },
  'delete-patient': { method: 'DELETE', path: '/api/patients/{id}' },
  'search-patients': { method: 'GET', path: '/api/patients/search' },

  // ═══════════════════════════════════════════════════════════════════
  // PATIENT MEDICATIONS (Read + Delete)
  // ═══════════════════════════════════════════════════════════════════
  'get-patient-medications': { method: 'GET', path: '/api/patients/{id}/medications' },
  'delete-patient-medication': { method: 'DELETE', path: '/api/patients/{id}/medications/{medicationId}' },

  // ═══════════════════════════════════════════════════════════════════
  // PATIENT ALLERGIES (Read + Delete)
  // ═══════════════════════════════════════════════════════════════════
  'get-patient-allergies': { method: 'GET', path: '/api/patients/{id}/allergies' },
  'delete-patient-allergy': { method: 'DELETE', path: '/api/patients/{id}/allergies/{allergyId}' },

  // ═══════════════════════════════════════════════════════════════════
  // PATIENT DIAGNOSES (Read + Delete)
  // ═══════════════════════════════════════════════════════════════════
  'get-patient-diagnoses': { method: 'GET', path: '/api/patients/{id}/diagnoses' },
  'delete-patient-diagnosis': { method: 'DELETE', path: '/api/patients/{id}/diagnoses/{diagnosisId}' },

  // ═══════════════════════════════════════════════════════════════════
  // PATIENT CONTEXT PRIMITIVES (Additional Data Access)
  // ═══════════════════════════════════════════════════════════════════
  'get-patient-context': { method: 'GET', path: '/api/patients/{id}/context' },
  'get-patient-vitals': { method: 'GET', path: '/api/patients/{id}/vitals' },
  'create-patient-vitals': { method: 'POST', path: '/api/patients/{id}/vitals' },
  'get-patient-dossier': { method: 'GET', path: '/api/patients/{id}/dossier' },
  'get-patient-risk-scores': { method: 'GET', path: '/api/patients/{id}/risk-scores' },
  'get-patient-documents': { method: 'GET', path: '/api/patients/{id}/documents' },
  'get-patient-preferences': { method: 'GET', path: '/api/patients/{id}/preferences' },
  'update-patient-preferences': { method: 'PUT', path: '/api/patients/{id}/preferences' },
  'get-patient-activity': { method: 'GET', path: '/api/patients/{id}/activity' },

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
  // CLINICAL PRIMITIVES (Atomic, Composable Operations)
  // ═══════════════════════════════════════════════════════════════════
  // These decompose clinical-decision into smaller, predictable primitives
  // for agent-native architecture compliance
  'get-differentials': { method: 'POST', path: '/api/clinical/primitives/get-differentials' },
  'get-treatment-options': { method: 'POST', path: '/api/clinical/primitives/get-treatment-options' },
  'evaluate-urgency': { method: 'POST', path: '/api/clinical/primitives/evaluate-urgency' },
  'validate-dose': { method: 'POST', path: '/api/clinical/primitives/validate-dose' },
  'merge-context': { method: 'POST', path: '/api/clinical/primitives/merge-context' },

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
  // FORM COMMUNICATION (Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'send-form': { method: 'POST', path: '/api/forms/send' },
  'get-sent-forms': { method: 'GET', path: '/api/forms/sent' },
  'get-form-response': { method: 'GET', path: '/api/forms/responses/{id}' },
  'get-form-templates': { method: 'GET', path: '/api/forms/templates' },
  'create-form-template': { method: 'POST', path: '/api/forms/templates' },

  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENT TOOLS
  // ═══════════════════════════════════════════════════════════════════
  'parse-document': { method: 'POST', path: '/api/documents/parse' },

  // ═══════════════════════════════════════════════════════════════════
  // LAB RESULTS (Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'list-lab-results': { method: 'GET', path: '/api/lab-results' },
  'create-lab-result': { method: 'POST', path: '/api/lab-results' },
  'get-lab-result': { method: 'GET', path: '/api/lab-results/{id}' },
  'update-lab-result': { method: 'PUT', path: '/api/lab-results/{id}' },
  'delete-lab-result': { method: 'DELETE', path: '/api/lab-results/{id}' },
  'monitor-lab-results': { method: 'GET', path: '/api/lab-results/monitor' },

  // ═══════════════════════════════════════════════════════════════════
  // PRESCRIPTIONS (Full CRUD + Actions)
  // ═══════════════════════════════════════════════════════════════════
  'list-prescriptions': { method: 'GET', path: '/api/prescriptions' },
  'create-prescription': { method: 'POST', path: '/api/prescriptions' },
  'get-prescription': { method: 'GET', path: '/api/prescriptions/{id}' },
  'update-prescription': { method: 'PUT', path: '/api/prescriptions/{id}' },
  'delete-prescription': { method: 'DELETE', path: '/api/prescriptions/{id}' },
  'sign-prescription': { method: 'POST', path: '/api/prescriptions/{id}/sign' },
  'send-prescription-to-pharmacy': { method: 'POST', path: '/api/prescriptions/{id}/send-to-pharmacy' },

  // ═══════════════════════════════════════════════════════════════════
  // MESSAGES (Communication Primitives)
  // ═══════════════════════════════════════════════════════════════════
  'list-messages': { method: 'GET', path: '/api/messages' },
  'create-message': { method: 'POST', path: '/api/messages' },
  'get-conversation-messages': { method: 'GET', path: '/api/messages/{conversationId}' },
  'search-messages': { method: 'GET', path: '/api/messages/search' },

  // ═══════════════════════════════════════════════════════════════════
  // AI SCRIBE (Transcription Primitives)
  // ═══════════════════════════════════════════════════════════════════
  'list-scribe-sessions': { method: 'GET', path: '/api/scribe/sessions' },
  'create-scribe-session': { method: 'POST', path: '/api/scribe/sessions' },
  'get-scribe-session': { method: 'GET', path: '/api/scribe/sessions/{id}' },
  'finalize-scribe-session': { method: 'POST', path: '/api/scribe/sessions/{id}/finalize' },
  'get-scribe-corrections': { method: 'GET', path: '/api/scribe/sessions/{id}/corrections' },
  'submit-scribe-correction': { method: 'POST', path: '/api/scribe/sessions/{id}/corrections' },
  'get-scribe-note': { method: 'GET', path: '/api/scribe/notes/{id}' },
  'sign-scribe-note': { method: 'POST', path: '/api/scribe/notes/{id}/sign' },
  'detect-language': { method: 'POST', path: '/api/scribe/language-detect' },

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

  // ═══════════════════════════════════════════════════════════════════
  // TRAFFIC LIGHT TOOLS (Clinical Safety + Revenue Integrity)
  // ═══════════════════════════════════════════════════════════════════
  'evaluate-traffic-light': { method: 'POST', path: '/api/traffic-light' },
  'override-traffic-light': { method: 'POST', path: '/api/traffic-light' },
  'get-traffic-light-rules': { method: 'GET', path: '/api/traffic-light' },

  // ═══════════════════════════════════════════════════════════════════
  // ASSURANCE EVENT TOOLS (RLHF Data Capture - Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'capture-assurance-event': { method: 'POST', path: '/api/assurance' },
  'list-assurance-events': { method: 'GET', path: '/api/assurance' },
  'record-assurance-decision': { method: 'PATCH', path: '/api/assurance' },
  'delete-assurance-event': { method: 'DELETE', path: '/api/assurance' },

  // ═══════════════════════════════════════════════════════════════════
  // HUMAN FEEDBACK TOOLS (RLHF - Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'get-feedback': { method: 'GET', path: '/api/assurance/feedback/{id}' },
  'update-feedback': { method: 'PUT', path: '/api/assurance/feedback/{id}' },
  'delete-feedback': { method: 'DELETE', path: '/api/assurance/feedback/{id}' },

  // ═══════════════════════════════════════════════════════════════════
  // OUTCOME GROUND TRUTH TOOLS (RLHF - Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'get-outcome': { method: 'GET', path: '/api/assurance/outcome/{id}' },
  'update-outcome': { method: 'PUT', path: '/api/assurance/outcome/{id}' },
  'delete-outcome': { method: 'DELETE', path: '/api/assurance/outcome/{id}' },

  // ═══════════════════════════════════════════════════════════════════
  // FEATURE FLAG TOOLS (Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'list-feature-flags': { method: 'GET', path: '/api/feature-flags' },
  'create-feature-flag': { method: 'POST', path: '/api/feature-flags' },
  'get-feature-flag': { method: 'GET', path: '/api/feature-flags/{id}' },
  'update-feature-flag': { method: 'PUT', path: '/api/feature-flags/{id}' },
  'delete-feature-flag': { method: 'DELETE', path: '/api/feature-flags/{id}' },

  // ═══════════════════════════════════════════════════════════════════
  // APPOINTMENT TOOLS (Full CRUD - Encounter Management)
  // ═══════════════════════════════════════════════════════════════════
  'list-appointments': { method: 'GET', path: '/api/appointments' },
  'create-appointment': { method: 'POST', path: '/api/appointments' },
  'get-appointment': { method: 'GET', path: '/api/appointments/{id}' },
  'update-appointment': { method: 'PATCH', path: '/api/appointments/{id}' },
  'delete-appointment': { method: 'DELETE', path: '/api/appointments/{id}' },
  'update-appointment-status': { method: 'PATCH', path: '/api/appointments/{id}/status' },

  // ═══════════════════════════════════════════════════════════════════
  // CLINICAL NOTES TOOLS (Full CRUD)
  // ═══════════════════════════════════════════════════════════════════
  'list-clinical-notes': { method: 'GET', path: '/api/clinical-notes' },
  'create-clinical-note': { method: 'POST', path: '/api/clinical-notes' },
  'get-clinical-note': { method: 'GET', path: '/api/clinical-notes/{id}' },
  'update-clinical-note': { method: 'PATCH', path: '/api/clinical-notes/{id}' },
  'delete-clinical-note': { method: 'DELETE', path: '/api/clinical-notes/{id}' },
  'get-clinical-note-versions': { method: 'GET', path: '/api/clinical-notes/{id}/versions' },

  // ═══════════════════════════════════════════════════════════════════
  // SYSTEM HEALTH & STATUS TOOLS
  // ═══════════════════════════════════════════════════════════════════
  'get-health-status': { method: 'GET', path: '/api/health' },
  'get-health-live': { method: 'GET', path: '/api/health/live' },
  'get-health-ready': { method: 'GET', path: '/api/health/ready' },
  'get-system-status': { method: 'GET', path: '/api/health/system' },
  'get-health-metrics': { method: 'GET', path: '/api/health/metrics' },
  'get-storage-status': { method: 'GET', path: '/api/health/storage' },
};

const KNOWN_VALIDATE_DOSE_STATUSES = new Set([
  'safe',
  'warning',
  'dangerous',
  'unknown',
  'attestation_required',
]);

function normalizeValidateDoseToolResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const record = data as Record<string, unknown>;
  const nested = record.data;
  if (!nested || typeof nested !== 'object') {
    return data;
  }

  const clinical = nested as Record<string, unknown>;
  const rawStatus = clinical.status;
  if (typeof rawStatus !== 'string') {
    return data;
  }

  if (KNOWN_VALIDATE_DOSE_STATUSES.has(rawStatus)) {
    return data;
  }

  return {
    ...record,
    data: {
      ...clinical,
      status: 'unknown',
      recommendation:
        typeof clinical.recommendation === 'string'
          ? `${clinical.recommendation} (Unrecognized status received; treated as unknown for safety.)`
          : 'Unrecognized status received from validate-dose; treated as unknown for safety.',
    },
    metadata: {
      ...(record.metadata && typeof record.metadata === 'object' ? (record.metadata as Record<string, unknown>) : {}),
      warning: 'Unrecognized validate-dose status normalized to unknown.',
    },
  };
}

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
  const rawData = await response.json();
  const data = tool === 'validate-dose' ? normalizeValidateDoseToolResponse(rawData) : rawData;

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
