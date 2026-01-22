/**
 * Clinical Alert Schema
 *
 * Validates AI-generated clinical decision support alerts.
 * Ensures alerts are actionable, prioritized, and evidence-based.
 */

import { z } from 'zod';

/**
 * Alert severity levels
 */
export const AlertSeveritySchema = z.enum([
  'info',       // Informational, no action required
  'low',        // Low priority, review when convenient
  'moderate',   // Medium priority, review soon
  'high',       // High priority, requires prompt attention
  'critical',   // Urgent, requires immediate attention
]);

/**
 * Alert categories
 */
export const AlertCategorySchema = z.enum([
  'drug_interaction',
  'allergy',
  'contraindication',
  'lab_abnormality',
  'vital_sign',
  'diagnosis',
  'preventive_care',
  'screening',
  'medication_adherence',
  'risk_assessment',
  'guideline_deviation',
  'duplicate_therapy',
  'dosing',
  'other',
]);

/**
 * Evidence source for clinical alerts
 */
export const EvidenceSourceSchema = z.object({
  type: z.enum([
    'clinical_guideline',
    'drug_database',
    'patient_record',
    'lab_result',
    'research_paper',
    'fda_label',
    'expert_consensus',
  ]),
  name: z.string(),
  url: z.string().url().optional(),
  citation: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Recommended action for an alert
 */
export const RecommendedActionSchema = z.object({
  action: z.string().min(1),
  priority: z.enum(['immediate', 'soon', 'routine']),
  details: z.string().optional(),
  alternativeActions: z.array(z.string()).optional(),
});

/**
 * Single clinical alert
 */
export const ClinicalAlertSchema = z.object({
  /** Unique alert identifier */
  id: z.string(),

  /** Alert type/category */
  category: AlertCategorySchema,

  /** Severity level */
  severity: AlertSeveritySchema,

  /** Brief title */
  title: z.string().min(1).max(200),

  /** Detailed description */
  description: z.string().min(1),

  /** Related patient ID (de-identified) */
  patientId: z.string().optional(),

  /** Related encounter ID */
  encounterId: z.string().optional(),

  /** Trigger data that caused this alert */
  trigger: z.object({
    type: z.string(),
    value: z.unknown(),
    threshold: z.unknown().optional(),
  }).optional(),

  /** Evidence supporting this alert */
  evidence: z.array(EvidenceSourceSchema).optional(),

  /** Recommended actions */
  recommendations: z.array(RecommendedActionSchema).min(1),

  /** Override information (if alert can be overridden) */
  override: z.object({
    allowed: z.boolean(),
    requiresReason: z.boolean(),
    requiresApproval: z.boolean().optional(),
    approverRole: z.string().optional(),
  }).optional(),

  /** Timestamp */
  generatedAt: z.string().datetime(),

  /** Expiration (if applicable) */
  expiresAt: z.string().datetime().optional(),

  /** AI confidence */
  confidence: z.number().min(0).max(1).optional(),

  /** Related codes (ICD-10, RxNorm, etc.) */
  relatedCodes: z.array(z.object({
    system: z.string(),
    code: z.string(),
    display: z.string().optional(),
  })).optional(),
}).describe('Clinical Alert');

export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;
export type AlertCategory = z.infer<typeof AlertCategorySchema>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;
export type ClinicalAlert = z.infer<typeof ClinicalAlertSchema>;

/**
 * Drug interaction alert schema
 */
export const DrugInteractionAlertSchema = ClinicalAlertSchema.extend({
  category: z.literal('drug_interaction'),
  interactionDetails: z.object({
    drug1: z.object({
      name: z.string(),
      rxnormCode: z.string().optional(),
    }),
    drug2: z.object({
      name: z.string(),
      rxnormCode: z.string().optional(),
    }),
    interactionType: z.enum(['major', 'moderate', 'minor']),
    mechanism: z.string().optional(),
    clinicalEffect: z.string(),
    management: z.string().optional(),
  }),
}).describe('Drug Interaction Alert');

export type DrugInteractionAlert = z.infer<typeof DrugInteractionAlertSchema>;

/**
 * Lab abnormality alert schema
 */
export const LabAbnormalityAlertSchema = ClinicalAlertSchema.extend({
  category: z.literal('lab_abnormality'),
  labDetails: z.object({
    testName: z.string(),
    loincCode: z.string().optional(),
    value: z.number(),
    unit: z.string(),
    referenceRange: z.object({
      low: z.number().optional(),
      high: z.number().optional(),
    }),
    abnormalityType: z.enum(['critical_low', 'low', 'high', 'critical_high', 'panic']),
    trend: z.enum(['increasing', 'decreasing', 'stable', 'unknown']).optional(),
  }),
}).describe('Lab Abnormality Alert');

export type LabAbnormalityAlert = z.infer<typeof LabAbnormalityAlertSchema>;

/**
 * Batch alert response
 */
export const AlertBatchResponseSchema = z.object({
  alerts: z.array(ClinicalAlertSchema),
  summary: z.object({
    totalAlerts: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    moderateCount: z.number(),
    lowCount: z.number(),
    infoCount: z.number(),
  }),
  metadata: z.object({
    generatedAt: z.string().datetime(),
    processingTimeMs: z.number().optional(),
    model: z.string().optional(),
  }).optional(),
}).describe('Alert Batch Response');

export type AlertBatchResponse = z.infer<typeof AlertBatchResponseSchema>;
