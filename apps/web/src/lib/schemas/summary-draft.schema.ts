/**
 * CDSS V3 - Summary Draft Validation Schema
 *
 * Zod schemas for validating LLM-generated meeting summary drafts.
 * Used to ensure type-safe output from Claude.
 */

import { z } from 'zod';

/**
 * Differential diagnosis entry
 */
const differentialSchema = z.object({
  diagnosis: z.string(),
  likelihood: z.enum(['high', 'medium', 'low']),
  icdCode: z.string().optional(),
});

/**
 * Medication in the plan
 */
const medicationPlanSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string().optional(),
});

/**
 * Next screening item
 */
const nextScreeningSchema = z.object({
  name: z.string(),
  dueDate: z.string(),
});

/**
 * Summary section with approval status
 */
const sectionWithApproval = <T extends z.ZodTypeAny>(schema: T) =>
  schema.and(
    z.object({
      confidence: z.number().min(0).max(1),
      approved: z.boolean().default(false),
    })
  );

/**
 * Summary Draft Schema
 *
 * This schema is used with Claude's JSON mode.
 * LLM MUST return data matching this structure.
 */
export const SummaryDraftSchema = z.object({
  chiefComplaint: z.object({
    text: z.string().max(500),
    confidence: z.number().min(0).max(1),
    approved: z.boolean().default(false),
  }),

  assessment: z.object({
    text: z.string().max(2000),
    differentials: z.array(differentialSchema).max(5),
    confidence: z.number().min(0).max(1),
    approved: z.boolean().default(false),
  }),

  plan: z.object({
    medications: z.array(medicationPlanSchema).default([]),
    labs: z.array(z.string()).default([]),
    imaging: z.array(z.string()).default([]),
    referrals: z.array(z.string()).default([]),
    instructions: z.string().max(1000),
    confidence: z.number().min(0).max(1),
    approved: z.boolean().default(false),
  }),

  prevention: z.object({
    screeningsAddressed: z.array(z.string()).default([]),
    nextScreenings: z.array(nextScreeningSchema).default([]),
    approved: z.boolean().default(false),
  }),

  followUp: z.object({
    interval: z.string(), // e.g., "2 weeks", "PRN"
    reason: z.string().max(200),
    approved: z.boolean().default(false),
  }),
});

/**
 * Partial summary for incremental updates
 */
export const PartialSummaryDraftSchema = SummaryDraftSchema.partial();

/**
 * Input schema for summary generation request
 */
export const SummaryGenerationInputSchema = z.object({
  encounterId: z.string(),
  transcript: z.string().min(10),
  patientContext: z.object({
    age: z.number(),
    sex: z.string(),
    conditions: z.array(z.string()),
    medications: z.array(z.string()),
  }),
  language: z.enum(['en', 'es', 'pt']).default('en'),
});

// Export types
export type SummaryDraft = z.infer<typeof SummaryDraftSchema>;
export type PartialSummaryDraft = z.infer<typeof PartialSummaryDraftSchema>;
export type SummaryGenerationInput = z.infer<typeof SummaryGenerationInputSchema>;
export type Differential = z.infer<typeof differentialSchema>;
export type MedicationPlan = z.infer<typeof medicationPlanSchema>;
export type NextScreening = z.infer<typeof nextScreeningSchema>;
