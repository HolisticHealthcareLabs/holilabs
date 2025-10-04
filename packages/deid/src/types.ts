import { z } from 'zod';

export const PolicySchema = z.object({
  version: z.string(),
  country: z.string().optional(),
  redaction: z.object({
    mode: z.enum(['HIPAA_SAFE_HARBOR']),
    identifiers: z.array(z.string()),
  }),
  generalization: z.object({
    age_bands: z.array(z.string()),
    dates: z.enum(['YEAR', 'YEAR_OR_QUARTER']),
    geo: z.enum(['ZIP3_OR_STATE', 'STATE_ONLY']),
  }),
  text_nlp: z.object({
    locales: z.array(z.string()),
    min_confidence: z.number(),
    fallback: z.enum(['REDACT', 'KEEP']),
  }),
  dicom_profiles: z.record(z.object({
    scrub_tags: z.string(),
    preserve_windowing: z.boolean().optional(),
    burn_in_removal: z.boolean().optional(),
  })),
  ocr: z.object({
    enabled: z.boolean(),
    adversarial: z.array(z.string()),
  }),
  dp_exports: z.object({
    enabled: z.boolean(),
    epsilon_default: z.number(),
    delta_default: z.number(),
    composition: z.string(),
    cooldown_minutes: z.number(),
  }),
  data_residency: z.object({
    region: z.string(),
    bucket_prefix: z.string(),
  }).optional(),
});

export type Policy = z.infer<typeof PolicySchema>;

export interface RedactionResult {
  redacted: any;
  counts: Record<string, number>;
  policyVersion: string;
}

export interface PseudonymizationResult {
  tokenId: string;
  pointerHash: string;
}

export interface GeneralizationResult {
  generalized: any;
  transformations: Record<string, string>;
}

export interface DICOMScrubResult {
  buffer: Buffer;
  tagsRemoved: string[];
}

export interface OCRResult {
  text: string;
  redactedText: string;
  detections: Array<{
    identifier: string;
    position: { x: number; y: number; width: number; height: number };
  }>;
}
