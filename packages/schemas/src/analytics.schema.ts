/**
 * Analytics & Search Schema - Single Source of Truth
 */

import { z } from 'zod';

// ============================================================================
// ANALYTICS SCHEMAS
// ============================================================================

export const AnalyticsQuerySchema = z.object({
  metric: z.enum([
    'patient_count',
    'appointments_today',
    'prescriptions_today',
    'clinical_notes_count',
    'active_medications',
    'consent_compliance',
  ]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  clinicianId: z.string().cuid().optional(),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['patients', 'prescriptions', 'clinical_notes', 'appointments', 'all']).optional().default('all'),
  limit: z.string().optional().default('20').transform(Number),
  offset: z.string().optional().default('0').transform(Number),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
