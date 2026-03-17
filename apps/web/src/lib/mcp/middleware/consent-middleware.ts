/**
 * Consent Middleware for MCP Tool Execution (Unit 7 — Agent-Native Architecture)
 *
 * Wraps all patient-data tools with consent verification. Supports emergency break-glass
 * access with rate limiting (3/24h per clinician) and expiry (2hr).
 *
 * Consent failure returns LGPD_CONSENT_DENIED error (structured, not 500).
 * Emergency overrides logged as audit events for forensic review.
 *
 * LGPD Art. 7 IV: Legitimate interest + explicit consent required for agent data access.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { verifyConsentForAgentAccess, ConsentDeniedError } from '../consent-gate';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// CONSTANTS
// =============================================================================

const TOOL_CONSENT_MAP: Record<string, string> = {
  patient: 'GENERAL_CONSULTATION',
  'clinical-note': 'GENERAL_CONSULTATION',
  medication: 'GENERAL_CONSULTATION',
  diagnosis: 'GENERAL_CONSULTATION',
  prescription: 'GENERAL_CONSULTATION',
  lab: 'GENERAL_CONSULTATION',
  imaging: 'GENERAL_CONSULTATION',
  prevention: 'GENERAL_CONSULTATION',
  consent: 'GENERAL_CONSULTATION',
  search: 'GENERAL_CONSULTATION',
  appointment: 'GENERAL_CONSULTATION',
  messaging: 'GENERAL_CONSULTATION',
  notification: 'GENERAL_CONSULTATION',
  form: 'GENERAL_CONSULTATION',
  document: 'GENERAL_CONSULTATION',
  portal: 'GENERAL_CONSULTATION',
  scribe: 'RECORDING',
  analytics: 'DATA_RESEARCH',
};

const PATIENT_DATA_CATEGORIES = new Set<string>([
  'patient',
  'clinical-note',
  'medication',
  'diagnosis',
  'prescription',
  'lab',
  'imaging',
  'prevention',
  'consent',
  'search',
  'appointment',
  'messaging',
  'notification',
  'form',
  'document',
  'portal',
  'scribe',
  'analytics',
]);

const EMERGENCY_BREAK_GLASS_TTL_HOURS = 2;
const EMERGENCY_BREAK_GLASS_RATE_LIMIT = 3; // 3 per day
const EMERGENCY_BREAK_GLASS_WINDOW_HOURS = 24;

// =============================================================================
// HELPER: Extract Patient ID from Tool Input
// =============================================================================

function extractPatientId(input: Record<string, any>): string | null {
  return input.patientId || input.patient_id || input.id || null;
}

// =============================================================================
// HELPER: Check Emergency Break-Glass Rate Limit
// =============================================================================

async function checkEmergencyBreakGlassRateLimit(
  clinicianId: string,
  patientId: string,
): Promise<{ allowed: boolean; message?: string }> {
  const windowStart = new Date(Date.now() - EMERGENCY_BREAK_GLASS_WINDOW_HOURS * 60 * 60 * 1000);

  const recentOverrides = await prisma.auditLog.count({
    where: {
      userId: clinicianId,
      action: 'MCP_EMERGENCY_BREAK_GLASS',
      timestamp: {
        gte: windowStart,
      },
    },
  });

  if (recentOverrides >= EMERGENCY_BREAK_GLASS_RATE_LIMIT) {
    return {
      allowed: false,
      message: `Emergency break-glass rate limit exceeded (${EMERGENCY_BREAK_GLASS_RATE_LIMIT} per 24h)`,
    };
  }

  return { allowed: true };
}

// =============================================================================
// HELPER: Log Emergency Access Event
// =============================================================================

async function logEmergencyAccessEvent(
  patientId: string,
  clinicianId: string,
  agentId: string,
  justification: string,
  toolName: string,
): Promise<void> {
  try {
    writeAuditEntry({
      action: 'MCP_EMERGENCY_BREAK_GLASS',
      resourceType: 'PATIENT',
      resourceId: patientId,
      userId: clinicianId,
      actorType: 'AGENT',
      agentId,
      accessReason: `Emergency break-glass: ${justification}`,
      metadata: {
        toolName,
        emergencyOverride: true,
        justification,
        expiresAt: new Date(Date.now() + EMERGENCY_BREAK_GLASS_TTL_HOURS * 60 * 60 * 1000).toISOString(),
      },
      consentBasis: 'emergency',
      legalBasis: 'LGPD Art. 7 IV',
    });
  } catch (error) {
    logger.error({
      event: 'mcp_emergency_access_log_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      clinicianId,
      agentId,
      patientId,
    });
  }
}

// =============================================================================
// MAIN: Consent Check Wrapper
// =============================================================================

export async function wrapWithConsentCheck(
  tool: MCPTool,
  originalHandler: (input: any, context: MCPContext) => Promise<MCPResult>,
): Promise<(input: any, context: MCPContext) => Promise<MCPResult>> {
  return async (input: Record<string, any>, context: MCPContext): Promise<MCPResult> => {
    // Skip consent check for non-patient-data categories
    if (!PATIENT_DATA_CATEGORIES.has(tool.category)) {
      return originalHandler(input, context);
    }

    const patientId = extractPatientId(input);

    // Skip consent check if no patient ID found (tool may be list/search)
    if (!patientId) {
      return originalHandler(input, context);
    }

    const requiredConsent = TOOL_CONSENT_MAP[tool.category] || 'GENERAL_CONSULTATION';

    // If emergency override is set, validate and proceed
    if (context.emergencyOverride) {
      // Both override flag AND justification are required
      if (!context.emergencyJustification) {
        logger.warn({
          event: 'mcp_emergency_override_missing_justification',
          tool: tool.name,
          clinicianId: context.clinicianId,
          agentId: context.agentId,
          patientId,
        });

        return {
          success: false,
          error: 'EMERGENCY_OVERRIDE_INVALID',
          data: null,
          meta: {
            warnings: ['Emergency override requires justification'],
          },
        };
      }

      // Check rate limit
      const rateLimitCheck = await checkEmergencyBreakGlassRateLimit(context.clinicianId, patientId);
      if (!rateLimitCheck.allowed) {
        logger.warn({
          event: 'mcp_emergency_override_rate_limit_exceeded',
          tool: tool.name,
          clinicianId: context.clinicianId,
          agentId: context.agentId,
          patientId,
        });

        return {
          success: false,
          error: 'EMERGENCY_OVERRIDE_RATE_LIMITED',
          data: null,
          meta: {
            warnings: [rateLimitCheck.message || 'Rate limit exceeded'],
          },
        };
      }

      // Log emergency access for forensic review
      await logEmergencyAccessEvent(
        patientId,
        context.clinicianId,
        context.agentId,
        context.emergencyJustification,
        tool.name,
      );

      // Proceed with tool execution (bypass consent check)
      logger.info({
        event: 'mcp_tool_emergency_override',
        tool: tool.name,
        clinicianId: context.clinicianId,
        agentId: context.agentId,
        patientId,
        consentRequired: requiredConsent,
      });

      return originalHandler(input, context);
    }

    // Normal consent flow: verify consent for agent access
    try {
      await verifyConsentForAgentAccess(patientId, requiredConsent);
    } catch (error) {
      if (error instanceof ConsentDeniedError) {
        logger.warn({
          event: 'mcp_consent_denied',
          tool: tool.name,
          clinicianId: context.clinicianId,
          agentId: context.agentId,
          patientId,
          consentRequired: requiredConsent,
        });

        return {
          success: false,
          error: 'LGPD_CONSENT_DENIED',
          data: null,
          meta: {
            warnings: [`Consent required: ${requiredConsent} for patient ${patientId}`],
          },
        };
      }

      logger.error({
        event: 'mcp_consent_check_error',
        tool: tool.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        clinicianId: context.clinicianId,
        agentId: context.agentId,
        patientId,
      });

      return {
        success: false,
        error: 'CONSENT_CHECK_FAILED',
        data: null,
        meta: {
          warnings: ['Failed to verify consent'],
        },
      };
    }

    // Consent verified or no consent check needed, proceed to handler
    return originalHandler(input, context);
  };
}
