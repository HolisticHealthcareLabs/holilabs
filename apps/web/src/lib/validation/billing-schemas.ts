/**
 * Zod Validation Schemas — Billing Intelligence API
 *
 * Validates request payloads for the four billing API endpoints:
 *   POST /api/billing/route-claim
 *   POST /api/billing/route-claim/batch
 *   GET  /api/billing/insurers
 *   GET  /api/billing/crosswalk
 */

import { z } from 'zod';

// ─── Shared Enums ────────────────────────────────────────────────────────────

const BillingCountryEnum = z.enum(['BR', 'AR', 'BO'], {
  errorMap: () => ({ message: 'Country must be BR, AR, or BO' }),
});

// ─── POST /api/billing/route-claim ───────────────────────────────────────────

export const RouteClaimSchema = z.object({
  snomedConceptId: z
    .string()
    .min(1, 'SNOMED concept ID is required')
    .max(20, 'SNOMED concept ID too long'),
  country: BillingCountryEnum,
  insurerId: z
    .string()
    .uuid('insurerId must be a valid UUID'),
  clinicianId: z
    .string()
    .uuid('clinicianId must be a valid UUID')
    .optional(),
});

export type RouteClaimInput = z.infer<typeof RouteClaimSchema>;

// ─── POST /api/billing/route-claim/batch ─────────────────────────────────────

export const BatchRouteClaimSchema = z.object({
  procedures: z
    .array(
      z.object({
        snomedConceptId: z
          .string()
          .min(1, 'SNOMED concept ID is required')
          .max(20, 'SNOMED concept ID too long'),
      })
    )
    .min(1, 'At least one procedure is required')
    .max(20, 'Maximum 20 procedures per batch'),
  country: BillingCountryEnum,
  insurerId: z
    .string()
    .uuid('insurerId must be a valid UUID'),
  clinicianId: z
    .string()
    .uuid('clinicianId must be a valid UUID')
    .optional(),
});

export type BatchRouteClaimInput = z.infer<typeof BatchRouteClaimSchema>;

// ─── GET /api/billing/insurers ───────────────────────────────────────────────

export const InsurersQuerySchema = z.object({
  country: BillingCountryEnum.optional(),
});

export type InsurersQueryInput = z.infer<typeof InsurersQuerySchema>;

// ─── GET /api/billing/crosswalk ──────────────────────────────────────────────

export const CrosswalkQuerySchema = z.object({
  snomedConceptId: z
    .string()
    .min(1, 'snomedConceptId query parameter is required')
    .max(20, 'SNOMED concept ID too long'),
  country: BillingCountryEnum,
});

export type CrosswalkQueryInput = z.infer<typeof CrosswalkQuerySchema>;
