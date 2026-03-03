/**
 * KPI Dictionary
 * Typed constant defining all platform KPIs with documented numerator/denominator.
 * FR-B1: Each KPI card must have a documented query reference.
 */

export interface KPIDictionaryEntry {
  queryId: string;
  label: string;
  numerator: string;
  denominator: string;
  unit: 'count' | 'percentage';
  sourceModel: string;
}

export const KPI_DICTIONARY = {
  totalEvaluations: {
    queryId: 'totalEvaluations',
    label: 'Total Evaluations',
    numerator: 'COUNT(*) FROM GovernanceEvent',
    denominator: 'N/A (absolute count)',
    unit: 'count',
    sourceModel: 'GovernanceEvent',
  },
  blockRate: {
    queryId: 'blockRate',
    label: 'Block Rate',
    numerator: "COUNT(*) WHERE severity = 'HARD_BLOCK'",
    denominator: 'COUNT(*) FROM GovernanceEvent',
    unit: 'percentage',
    sourceModel: 'GovernanceEvent',
  },
  overrideRate: {
    queryId: 'overrideRate',
    label: 'Override Rate',
    numerator: 'COUNT(*) WHERE overrideByUser = true',
    denominator: "COUNT(*) WHERE severity IN ('HARD_BLOCK', 'SOFT_NUDGE')",
    unit: 'percentage',
    sourceModel: 'GovernanceEvent',
  },
  attestationCompliance: {
    queryId: 'attestationCompliance',
    label: 'Attestation Compliance',
    numerator: "COUNT(*) WHERE severity = 'SOFT_NUDGE' AND overrideByUser = true",
    denominator: "COUNT(*) WHERE severity = 'SOFT_NUDGE'",
    unit: 'percentage',
    sourceModel: 'GovernanceEvent',
  },
  reminderReach: {
    queryId: 'reminderReach',
    label: 'Reminder Reach',
    numerator: "COUNT(*) WHERE status = 'SENT'",
    denominator: 'COUNT(*) FROM ScheduledReminder',
    unit: 'percentage',
    sourceModel: 'ScheduledReminder',
  },
  escalationSlaClosure: {
    queryId: 'escalationSlaClosure',
    label: 'Escalation SLA Closure',
    numerator: "COUNT(*) WHERE status = 'RESOLVED'",
    denominator: 'COUNT(*) FROM Escalation',
    unit: 'percentage',
    sourceModel: 'Escalation',
  },
  groundTruthAcceptRate: {
    queryId: 'groundTruthAcceptRate',
    label: 'Ground Truth Accept Rate',
    numerator: 'COUNT(*) WHERE humanOverride = false AND decidedAt IS NOT NULL',
    denominator: 'COUNT(*) WHERE decidedAt IS NOT NULL',
    unit: 'percentage',
    sourceModel: 'AssuranceEvent',
  },
  preventionCompletion: {
    queryId: 'preventionCompletion',
    label: 'Prevention Plan Completion',
    numerator: "COUNT(*) WHERE status = 'COMPLETED'",
    denominator: "COUNT(*) WHERE status NOT IN ('ARCHIVED')",
    unit: 'percentage',
    sourceModel: 'PreventionPlan',
  },
} as const satisfies Record<string, KPIDictionaryEntry>;

export type KPIDictionaryKey = keyof typeof KPI_DICTIONARY;
