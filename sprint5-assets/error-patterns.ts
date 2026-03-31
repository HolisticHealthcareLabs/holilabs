/**
 * HoliLabs Error Handling System
 *
 * Typed error hierarchy, API response format, error boundary, audit logging.
 * Drop into src/lib/errors/ and import across the app.
 *
 * Domains: ELENA (clinical safety), RUTH (compliance), CYRUS (security), business logic.
 */

// ─── Error Hierarchy ─────────────────────────────────────────────────────────

export class HoliLabsError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly domain: 'clinical' | 'compliance' | 'security' | 'business' | 'system';
  public readonly retryable: boolean;
  public readonly userMessage: Record<string, string>;
  public readonly metadata?: Record<string, unknown>;

  constructor(opts: {
    code: string;
    message: string;
    httpStatus: number;
    domain: HoliLabsError['domain'];
    retryable?: boolean;
    userMessage?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.name = 'HoliLabsError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.domain = opts.domain;
    this.retryable = opts.retryable ?? false;
    this.userMessage = opts.userMessage ?? {
      en: 'An unexpected error occurred.',
      'pt-BR': 'Ocorreu um erro inesperado.',
      es: 'Ocurrió un error inesperado.',
    };
    this.metadata = opts.metadata;
  }
}

/** ELENA domain — clinical safety errors. Page on-call if unhandled. */
export class ClinicalSafetyError extends HoliLabsError {
  constructor(opts: { code: string; message: string; httpStatus?: number; metadata?: Record<string, unknown>; userMessage?: Record<string, string> }) {
    super({ ...opts, domain: 'clinical', httpStatus: opts.httpStatus ?? 422, retryable: false, userMessage: opts.userMessage ?? {
      en: 'A clinical safety check failed. Please review and try again.',
      'pt-BR': 'Uma verificação de segurança clínica falhou. Revise e tente novamente.',
      es: 'Una verificación de seguridad clínica falló. Revise e intente de nuevo.',
    }});
    this.name = 'ClinicalSafetyError';
  }
}

/** RUTH domain — regulatory/compliance errors */
export class ComplianceError extends HoliLabsError {
  constructor(opts: { code: string; message: string; httpStatus?: number; metadata?: Record<string, unknown>; userMessage?: Record<string, string> }) {
    super({ ...opts, domain: 'compliance', httpStatus: opts.httpStatus ?? 403, retryable: false, userMessage: opts.userMessage ?? {
      en: 'This action is restricted by compliance requirements.',
      'pt-BR': 'Esta ação é restrita por requisitos de conformidade.',
      es: 'Esta acción está restringida por requisitos de cumplimiento.',
    }});
    this.name = 'ComplianceError';
  }
}

/** CYRUS domain — security errors. Page CISO if breach detected. */
export class SecurityError extends HoliLabsError {
  constructor(opts: { code: string; message: string; httpStatus?: number; metadata?: Record<string, unknown>; userMessage?: Record<string, string> }) {
    super({ ...opts, domain: 'security', httpStatus: opts.httpStatus ?? 403, retryable: false, userMessage: opts.userMessage ?? {
      en: 'Access denied. This action has been logged.',
      'pt-BR': 'Acesso negado. Esta ação foi registrada.',
      es: 'Acceso denegado. Esta acción ha sido registrada.',
    }});
    this.name = 'SecurityError';
  }
}

export class BusinessLogicError extends HoliLabsError {
  constructor(opts: { code: string; message: string; httpStatus?: number; retryable?: boolean; metadata?: Record<string, unknown>; userMessage?: Record<string, string> }) {
    super({ ...opts, domain: 'business', httpStatus: opts.httpStatus ?? 400 });
    this.name = 'BusinessLogicError';
  }
}

// ─── Error Code Catalog ──────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Clinical Safety (E-1xxx) — ELENA domain
  'E-1001': { message: 'Screening instrument incomplete', class: ClinicalSafetyError, httpStatus: 422 },
  'E-1002': { message: 'Missing sourceAuthority on clinical rule', class: ClinicalSafetyError, httpStatus: 500 },
  'E-1003': { message: 'Drug interaction detected — review required', class: ClinicalSafetyError, httpStatus: 200 },
  'E-1004': { message: 'AI suggestion confidence below threshold', class: ClinicalSafetyError, httpStatus: 200 },
  'E-1005': { message: 'Clinical rule provenance missing citation', class: ClinicalSafetyError, httpStatus: 500 },
  'E-1010': { message: 'Suicidal ideation flag — safety assessment required', class: ClinicalSafetyError, httpStatus: 200 },

  // Compliance (E-2xxx) — RUTH domain
  'E-2001': { message: 'Patient consent not granted for this channel', class: ComplianceError, httpStatus: 403 },
  'E-2002': { message: 'PHI detected in message body', class: ComplianceError, httpStatus: 400 },
  'E-2003': { message: 'SaMD-restricted language in patient-facing text', class: ComplianceError, httpStatus: 400 },
  'E-2004': { message: 'Data export without legal basis', class: ComplianceError, httpStatus: 403 },
  'E-2005': { message: 'Consent withdrawn — stop all communications', class: ComplianceError, httpStatus: 403 },
  'E-2006': { message: 'Audit log deletion attempted — LGPD Art. 37 violation', class: ComplianceError, httpStatus: 403 },
  'E-2010': { message: 'FHIR resource missing required CNS identifier', class: ComplianceError, httpStatus: 422 },

  // Security (E-3xxx) — CYRUS domain
  'E-3001': { message: 'Authentication required', class: SecurityError, httpStatus: 401 },
  'E-3002': { message: 'Insufficient role permissions', class: SecurityError, httpStatus: 403 },
  'E-3003': { message: 'Cross-tenant access denied', class: SecurityError, httpStatus: 404 },
  'E-3004': { message: 'X-Access-Reason header required for PHI', class: SecurityError, httpStatus: 403 },
  'E-3005': { message: 'Invalid X-Access-Reason value', class: SecurityError, httpStatus: 403 },
  'E-3006': { message: 'Invalid Twilio webhook signature', class: SecurityError, httpStatus: 403 },
  'E-3007': { message: 'Replay attack detected (duplicate MessageSid)', class: SecurityError, httpStatus: 409 },
  'E-3008': { message: 'PII field not encrypted', class: SecurityError, httpStatus: 500 },
  'E-3009': { message: 'Audit hash chain integrity violation', class: SecurityError, httpStatus: 500 },
  'E-3010': { message: 'ORG_ADMIN approval required for this action', class: SecurityError, httpStatus: 403 },

  // Business Logic (E-4xxx)
  'E-4001': { message: 'Invoice already voided', class: BusinessLogicError, httpStatus: 409 },
  'E-4002': { message: 'Void reason required', class: BusinessLogicError, httpStatus: 400 },
  'E-4003': { message: 'Encounter already finalized', class: BusinessLogicError, httpStatus: 409 },
  'E-4004': { message: 'Invalid billing code', class: BusinessLogicError, httpStatus: 400 },
  'E-4005': { message: 'Patient not found', class: BusinessLogicError, httpStatus: 404 },
  'E-4006': { message: 'Encounter not found', class: BusinessLogicError, httpStatus: 404 },
  'E-4010': { message: 'WhatsApp 24h service window expired — use template', class: BusinessLogicError, httpStatus: 400 },

  // System (E-5xxx)
  'E-5001': { message: 'Database connection failed', class: HoliLabsError, httpStatus: 500 },
  'E-5002': { message: 'External API timeout (Deepgram/Twilio/LLM)', class: HoliLabsError, httpStatus: 502 },
  'E-5003': { message: 'Rate limit exceeded', class: HoliLabsError, httpStatus: 429 },
  'E-5004': { message: 'File upload too large', class: HoliLabsError, httpStatus: 413 },
} as const;

// ─── API Error Response Format ───────────────────────────────────────────────

export interface ApiErrorResponse {
  error: string;          // Error code (e.g., "E-3001")
  message: string;        // Developer message (English)
  userMessage: string;    // User-facing message (locale-aware)
  domain: string;         // clinical | compliance | security | business | system
  retryable: boolean;
  timestamp: string;
  requestId?: string;
}

export function toApiError(error: HoliLabsError, locale: string = 'pt-BR', requestId?: string): ApiErrorResponse {
  return {
    error: error.code,
    message: error.message,
    userMessage: error.userMessage[locale] || error.userMessage['en'],
    domain: error.domain,
    retryable: error.retryable,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// ─── Retry Policies ──────────────────────────────────────────────────────────

export const RETRY_POLICIES: Record<string, { maxRetries: number; backoffMs: number; backoffMultiplier: number }> = {
  'E-5001': { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },   // DB: retry with exponential backoff
  'E-5002': { maxRetries: 2, backoffMs: 2000, backoffMultiplier: 2 },   // External API: retry twice
  'E-5003': { maxRetries: 1, backoffMs: 60000, backoffMultiplier: 1 },  // Rate limit: wait 60s, retry once
  'E-4010': { maxRetries: 0, backoffMs: 0, backoffMultiplier: 0 },      // 24h window: no retry, use template
};

// ─── Escalation Rules ────────────────────────────────────────────────────────

export const ESCALATION_RULES: Record<string, { action: string; channel: string; urgency: string }> = {
  clinical:   { action: 'Page on-call clinician', channel: 'WhatsApp + Email', urgency: 'immediate' },
  security:   { action: 'Page CISO (CYRUS)', channel: 'SMS + Email', urgency: 'immediate' },
  compliance: { action: 'Notify compliance officer (RUTH)', channel: 'Email', urgency: '1 hour' },
  business:   { action: 'Log and notify support', channel: 'Slack', urgency: 'next business day' },
  system:     { action: 'Alert DevOps', channel: 'PagerDuty', urgency: '15 minutes' },
};

// ─── Error Logging with Audit Trail ──────────────────────────────────────────

interface ErrorContext {
  userId?: string;
  patientId?: string;
  encounterId?: string;
  endpoint?: string;
  requestId?: string;
}

/**
 * Log error with audit trail. CYRUS invariant: all errors logged.
 * Security and clinical errors create AuditLog entries.
 */
export async function logError(error: HoliLabsError, context: ErrorContext, prisma?: { auditLog: { create: (args: unknown) => Promise<unknown> } }) {
  // Console log for dev/debugging
  console.error(`[${error.domain.toUpperCase()}] ${error.code}: ${error.message}`, {
    ...context,
    retryable: error.retryable,
    metadata: error.metadata,
  });

  // Audit log for security and clinical errors
  if (prisma && (error.domain === 'security' || error.domain === 'clinical' || error.domain === 'compliance')) {
    try {
      await prisma.auditLog.create({
        data: {
          actionType: `ERROR_${error.domain.toUpperCase()}`,
          userId: context.userId || 'system',
          entityType: 'Error',
          entityId: error.code,
          accessReason: 'SYSTEM',
          details: JSON.stringify({ message: error.message, context, metadata: error.metadata }),
        },
      });
    } catch {
      // Don't let audit logging failure mask the original error
      console.error('Failed to write error audit log');
    }
  }

  // Escalation check
  const escalation = ESCALATION_RULES[error.domain];
  if (escalation && (error.domain === 'clinical' || error.domain === 'security')) {
    // TODO: holilabsv2 — integrate with PagerDuty/notification system
    console.warn(`ESCALATION: ${escalation.action} via ${escalation.channel} (${escalation.urgency})`);
  }
}

// ─── React Error Boundary (Clinical Safety) ──────────────────────────────────

// TODO: holilabsv2 — this is a scaffold. Import React properly in your component file.
// export class ClinicalErrorBoundary extends React.Component<
//   { children: React.ReactNode; fallback?: React.ReactNode },
//   { hasError: boolean; error: Error | null }
// > {
//   state = { hasError: false, error: null as Error | null };
//
//   static getDerivedStateFromError(error: Error) {
//     return { hasError: true, error };
//   }
//
//   componentDidCatch(error: Error) {
//     if (error instanceof ClinicalSafetyError) {
//       logError(error, { endpoint: window.location.pathname });
//     }
//   }
//
//   render() {
//     if (this.state.hasError) {
//       return this.props.fallback || (
//         <div role="alert" className="p-md rounded-lg bg-severity-severe/10 border border-severity-severe/20">
//           <p className="text-heading-sm font-semibold text-severity-severe">Clinical Safety Error</p>
//           <p className="text-body text-severity-severe/80">
//             A safety check prevented this action. Please review the clinical data and try again.
//           </p>
//         </div>
//       );
//     }
//     return this.props.children;
//   }
// }
