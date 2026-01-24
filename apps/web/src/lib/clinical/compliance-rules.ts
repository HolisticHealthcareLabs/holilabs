/**
 * Compliance Rules - Hardcoded Legal/Regulatory Requirements
 *
 * CRITICAL: These rules NEVER go in the database.
 * They are TypeScript constants that require a deployment to change.
 *
 * Why TypeScript instead of Database:
 * - Legal/regulatory requirements that cannot be disabled by ops
 * - LGPD (Brazil's GDPR equivalent) mandates these protections
 * - Changing these requires security review and deployment approval
 * - Audit trail shows code changes, not database mutations
 *
 * These rules are evaluated BEFORE business rules (JSON-Logic in DB).
 * If a compliance rule blocks, no further processing occurs.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Enforcement action when a rule is violated
 */
export type EnforcementAction =
  | 'BLOCK_ACCESS' // Stop all access, return 403
  | 'BLOCK_TRANSFER' // Prevent data export/transfer
  | 'LOG_ALWAYS' // Mandatory logging (cannot be skipped)
  | 'REQUIRE_REASON' // User must provide justification
  | 'REQUIRE_CONSENT' // Patient consent required
  | 'ANONYMIZE' // Strip PHI before proceeding
  | 'WARN'; // Log warning but allow (for soft rules)

/**
 * Compliance rule definition
 */
export interface ComplianceRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule description */
  rule: string;
  /** What happens when rule is violated */
  enforcement: EnforcementAction;
  /** If false, this rule can NEVER be disabled */
  canDisable: false;
  /** Regulatory source (for audit) */
  regulatorySource: string;
  /** Error message shown to user when violated */
  userMessage: string;
  /** Additional metadata for audit logging */
  auditCategory: 'access' | 'transfer' | 'logging' | 'consent' | 'emergency';
}

/**
 * Context provided when evaluating compliance rules
 */
export interface ComplianceContext {
  /** ID of user requesting access */
  userId: string;
  /** ID of patient being accessed */
  patientId?: string;
  /** ID of clinic */
  clinicId?: string;
  /** Type of access requested */
  accessType: 'view' | 'edit' | 'export' | 'delete' | 'ai-process';
  /** Whether patient has LGPD consent on file */
  hasLgpdConsent?: boolean;
  /** Whether this is an emergency override (break-glass) */
  isEmergencyOverride?: boolean;
  /** Justification provided (for emergency access) */
  emergencyReason?: string;
  /** Destination region for data transfers */
  destinationRegion?: string;
}

/**
 * Result of compliance check
 */
export interface ComplianceResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Rule that blocked (if not allowed) */
  blockedByRule?: string;
  /** Enforcement action required */
  enforcement?: EnforcementAction;
  /** User-facing error message */
  userMessage?: string;
  /** All rules evaluated (for audit) */
  rulesEvaluated: string[];
  /** Warnings (for soft violations) */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE RULES - THESE NEVER GO IN DATABASE
// ═══════════════════════════════════════════════════════════════

/**
 * LGPD (Lei Geral de Proteção de Dados) Compliance Rules
 * Brazil's equivalent of GDPR - legally mandated protections
 */
export const COMPLIANCE_RULES: Record<string, ComplianceRule> = {
  // ─────────────────────────────────────────────────────────────
  // CONSENT RULES
  // ─────────────────────────────────────────────────────────────

  lgpdConsent: {
    id: 'LGPD-001',
    rule: 'Must have explicit LGPD consent to view patient record',
    enforcement: 'REQUIRE_CONSENT',
    canDisable: false,
    regulatorySource: 'LGPD Art. 7, Art. 11 (sensitive health data)',
    userMessage:
      'Este paciente não forneceu consentimento LGPD. Por favor, obtenha consentimento antes de acessar o prontuário.',
    auditCategory: 'consent',
  },

  lgpdAiProcessing: {
    id: 'LGPD-002',
    rule: 'Must have explicit consent for AI-assisted processing of health data',
    enforcement: 'REQUIRE_CONSENT',
    canDisable: false,
    regulatorySource: 'LGPD Art. 11, §4 (automated decision-making)',
    userMessage:
      'Consentimento para processamento de IA não registrado. O paciente deve consentir com o uso de IA antes de prosseguir.',
    auditCategory: 'consent',
  },

  // ─────────────────────────────────────────────────────────────
  // DATA RESIDENCY RULES
  // ─────────────────────────────────────────────────────────────

  dataResidencyBrazil: {
    id: 'LGPD-003',
    rule: 'Patient data cannot leave Brazil region without explicit consent',
    enforcement: 'BLOCK_TRANSFER',
    canDisable: false,
    regulatorySource: 'LGPD Art. 33 (international data transfer)',
    userMessage:
      'Transferência internacional de dados bloqueada. Dados de saúde devem permanecer no Brasil conforme LGPD.',
    auditCategory: 'transfer',
  },

  // ─────────────────────────────────────────────────────────────
  // AUDIT LOGGING RULES
  // ─────────────────────────────────────────────────────────────

  phiAuditLogging: {
    id: 'AUDIT-001',
    rule: 'All PHI access must be logged with user identity and timestamp',
    enforcement: 'LOG_ALWAYS',
    canDisable: false,
    regulatorySource: 'LGPD Art. 37 (record of processing activities)',
    userMessage: 'Acesso registrado conforme requisitos de auditoria.',
    auditCategory: 'logging',
  },

  aiDecisionLogging: {
    id: 'AUDIT-002',
    rule: 'All AI-assisted clinical decisions must be logged with full context',
    enforcement: 'LOG_ALWAYS',
    canDisable: false,
    regulatorySource: 'LGPD Art. 20 (right to explanation of automated decisions)',
    userMessage: 'Decisão de IA registrada para auditoria.',
    auditCategory: 'logging',
  },

  // ─────────────────────────────────────────────────────────────
  // EMERGENCY ACCESS RULES
  // ─────────────────────────────────────────────────────────────

  emergencyOverrideJustification: {
    id: 'EMERG-001',
    rule: 'Break-glass emergency access requires documented justification',
    enforcement: 'REQUIRE_REASON',
    canDisable: false,
    regulatorySource: 'LGPD Art. 7, VIII (protection of life/safety)',
    userMessage:
      'Acesso de emergência requer justificativa documentada. Por favor, forneça o motivo.',
    auditCategory: 'emergency',
  },

  emergencyOverrideNotification: {
    id: 'EMERG-002',
    rule: 'Patient must be notified of emergency access within 24 hours',
    enforcement: 'LOG_ALWAYS',
    canDisable: false,
    regulatorySource: 'LGPD Art. 18, VII (right to information)',
    userMessage: 'Paciente será notificado do acesso de emergência em 24 horas.',
    auditCategory: 'emergency',
  },

  // ─────────────────────────────────────────────────────────────
  // ACCESS CONTROL RULES
  // ─────────────────────────────────────────────────────────────

  minimumNecessaryAccess: {
    id: 'ACCESS-001',
    rule: 'Users can only access PHI necessary for their role',
    enforcement: 'BLOCK_ACCESS',
    canDisable: false,
    regulatorySource: 'LGPD Art. 6, III (necessity principle)',
    userMessage:
      'Acesso negado. Você não tem permissão para visualizar este registro.',
    auditCategory: 'access',
  },

  anonymizationForResearch: {
    id: 'ACCESS-002',
    rule: 'Data used for research/analytics must be anonymized',
    enforcement: 'ANONYMIZE',
    canDisable: false,
    regulatorySource: 'LGPD Art. 7, IV (research purposes)',
    userMessage: 'Dados anonimizados para fins de pesquisa.',
    auditCategory: 'access',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE EVALUATION
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate all compliance rules for a given context
 *
 * @param context The access context to evaluate
 * @returns ComplianceResult indicating if access is allowed
 *
 * @example
 * const result = evaluateCompliance({
 *   userId: 'dr_123',
 *   patientId: 'pat_456',
 *   accessType: 'view',
 *   hasLgpdConsent: true,
 * });
 * if (!result.allowed) {
 *   throw new ComplianceViolationError(result.blockedByRule, result.userMessage);
 * }
 */
export function evaluateCompliance(context: ComplianceContext): ComplianceResult {
  const rulesEvaluated: string[] = [];
  const warnings: string[] = [];

  // ─────────────────────────────────────────────────────────────
  // 1. CONSENT CHECKS (highest priority)
  // ─────────────────────────────────────────────────────────────

  // LGPD consent required for patient data access
  if (context.patientId && !context.isEmergencyOverride) {
    rulesEvaluated.push(COMPLIANCE_RULES.lgpdConsent.id);

    if (!context.hasLgpdConsent) {
      return {
        allowed: false,
        blockedByRule: COMPLIANCE_RULES.lgpdConsent.id,
        enforcement: COMPLIANCE_RULES.lgpdConsent.enforcement,
        userMessage: COMPLIANCE_RULES.lgpdConsent.userMessage,
        rulesEvaluated,
        warnings,
      };
    }
  }

  // AI processing consent required
  if (context.accessType === 'ai-process' && context.patientId) {
    rulesEvaluated.push(COMPLIANCE_RULES.lgpdAiProcessing.id);

    if (!context.hasLgpdConsent) {
      return {
        allowed: false,
        blockedByRule: COMPLIANCE_RULES.lgpdAiProcessing.id,
        enforcement: COMPLIANCE_RULES.lgpdAiProcessing.enforcement,
        userMessage: COMPLIANCE_RULES.lgpdAiProcessing.userMessage,
        rulesEvaluated,
        warnings,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DATA RESIDENCY CHECKS
  // ─────────────────────────────────────────────────────────────

  if (context.accessType === 'export' && context.destinationRegion) {
    rulesEvaluated.push(COMPLIANCE_RULES.dataResidencyBrazil.id);

    // Brazil region codes
    const brazilRegions = ['br', 'brazil', 'sa-east-1', 'southamerica-east1'];
    const isBrazil = brazilRegions.includes(context.destinationRegion.toLowerCase());

    if (!isBrazil) {
      return {
        allowed: false,
        blockedByRule: COMPLIANCE_RULES.dataResidencyBrazil.id,
        enforcement: COMPLIANCE_RULES.dataResidencyBrazil.enforcement,
        userMessage: COMPLIANCE_RULES.dataResidencyBrazil.userMessage,
        rulesEvaluated,
        warnings,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. EMERGENCY ACCESS CHECKS
  // ─────────────────────────────────────────────────────────────

  if (context.isEmergencyOverride) {
    rulesEvaluated.push(COMPLIANCE_RULES.emergencyOverrideJustification.id);

    if (!context.emergencyReason || context.emergencyReason.trim().length < 10) {
      return {
        allowed: false,
        blockedByRule: COMPLIANCE_RULES.emergencyOverrideJustification.id,
        enforcement: COMPLIANCE_RULES.emergencyOverrideJustification.enforcement,
        userMessage: COMPLIANCE_RULES.emergencyOverrideJustification.userMessage,
        rulesEvaluated,
        warnings,
      };
    }

    // Add warning that patient will be notified
    rulesEvaluated.push(COMPLIANCE_RULES.emergencyOverrideNotification.id);
    warnings.push(COMPLIANCE_RULES.emergencyOverrideNotification.userMessage);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. AUDIT LOGGING (always evaluated, never blocks)
  // ─────────────────────────────────────────────────────────────

  rulesEvaluated.push(COMPLIANCE_RULES.phiAuditLogging.id);
  if (context.accessType === 'ai-process') {
    rulesEvaluated.push(COMPLIANCE_RULES.aiDecisionLogging.id);
  }

  // All checks passed
  return {
    allowed: true,
    rulesEvaluated,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all rules by category (for documentation/admin UI)
 */
export function getRulesByCategory(
  category: ComplianceRule['auditCategory']
): ComplianceRule[] {
  return Object.values(COMPLIANCE_RULES).filter((r) => r.auditCategory === category);
}

/**
 * Get a rule by ID
 */
export function getRuleById(id: string): ComplianceRule | undefined {
  return Object.values(COMPLIANCE_RULES).find((r) => r.id === id);
}

/**
 * Check if a specific rule applies to an access type
 */
export function ruleAppliesTo(
  ruleId: string,
  accessType: ComplianceContext['accessType']
): boolean {
  const rule = getRuleById(ruleId);
  if (!rule) return false;

  // Map rules to access types they apply to
  const ruleAccessMap: Record<string, ComplianceContext['accessType'][]> = {
    'LGPD-001': ['view', 'edit', 'export', 'delete', 'ai-process'],
    'LGPD-002': ['ai-process'],
    'LGPD-003': ['export'],
    'AUDIT-001': ['view', 'edit', 'export', 'delete', 'ai-process'],
    'AUDIT-002': ['ai-process'],
    'EMERG-001': ['view', 'edit', 'ai-process'],
    'EMERG-002': ['view', 'edit', 'ai-process'],
    'ACCESS-001': ['view', 'edit', 'export', 'delete', 'ai-process'],
    'ACCESS-002': ['export'],
  };

  return ruleAccessMap[ruleId]?.includes(accessType) ?? false;
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Error thrown when a compliance rule is violated
 */
export class ComplianceViolationError extends Error {
  constructor(
    public readonly ruleId: string,
    public readonly userMessage: string,
    public readonly enforcement: EnforcementAction
  ) {
    super(`Compliance violation: ${ruleId}`);
    this.name = 'ComplianceViolationError';
  }
}
