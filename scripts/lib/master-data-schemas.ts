/**
 * Zod Validation Schemas for Master Data
 *
 * Used by:
 *   - scripts/extract-master-data.ts (extraction + PII scan)
 *   - scripts/seed-master-data.ts (runtime validation)
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Clinical Rule Schemas
// ---------------------------------------------------------------------------

export const ClinicalRuleProvenanceSchema = z.object({
  sourceAuthority: z.string().min(1),
  sourceDocument: z.string().min(1),
  sourceVersion: z.string().min(1),
  effectiveDate: z.string().min(1),
  jurisdiction: z.string().optional(),
  citationUrl: z.string().min(1),
  licenseType: z.string().optional(),
  evidenceGrade: z.string().optional(),
  reviewedBy: z.string().optional(),
  lastReviewDate: z.string().optional(),
});

export const ClinicalRuleSchema = z.object({
  ruleId: z.string().min(1),
  name: z.string().optional(),
  medication: z.string().optional(),
  condition: z.string().optional(),
  domain: z.string().optional(),
  severity: z.enum(['BLOCK', 'FLAG', 'INFO', 'ATTESTATION_REQUIRED']),
  rationale: z.string().optional(),
  provenance: ClinicalRuleProvenanceSchema,
  logic: z.record(z.unknown()).optional(),
  intervention: z
    .object({
      message: z.string(),
      recommendation: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const MasterRulesFileSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().min(1),
  generatedAt: z.string().min(1),
  generatedBy: z.string().min(1),
  piiScanResult: z.enum(['CLEAN', 'CONTAMINATED']),
  rules: z.array(ClinicalRuleSchema),
});

// ---------------------------------------------------------------------------
// TUSS / CBHPM Billing Code Schemas
// ---------------------------------------------------------------------------

export const TUSSCodeSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  baseRateBOB: z.number(),
  baseRateBRL: z.number().nullable(),
  applicableSeverities: z.array(z.string()),
});

export const MasterTUSSFileSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().min(1),
  generatedAt: z.string().min(1),
  generatedBy: z.string().min(1),
  piiScanResult: z.enum(['CLEAN', 'CONTAMINATED']),
  codes: z.array(TUSSCodeSchema),
});

// ---------------------------------------------------------------------------
// Type Exports
// ---------------------------------------------------------------------------

export type ClinicalRuleProvenance = z.infer<typeof ClinicalRuleProvenanceSchema>;
export type ClinicalRule = z.infer<typeof ClinicalRuleSchema>;
export type MasterRulesFile = z.infer<typeof MasterRulesFileSchema>;
export type TUSSCode = z.infer<typeof TUSSCodeSchema>;
export type MasterTUSSFile = z.infer<typeof MasterTUSSFileSchema>;
