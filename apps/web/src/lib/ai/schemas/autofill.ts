/**
 * Autofill Schema
 *
 * Validates AI-generated autofill suggestions for clinical forms.
 * Ensures suggestions are safe and properly formatted.
 */

import { z } from 'zod';

/**
 * Single autofill suggestion
 */
export const AutofillSuggestionSchema = z.object({
  /** The field ID or name to autofill */
  fieldId: z.string().min(1),
  /** The suggested value */
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** Source of the suggestion */
  source: z.enum([
    'patient_history',
    'encounter_transcript',
    'lab_results',
    'prior_notes',
    'medication_list',
    'inferred',
  ]).optional(),
  /** Human-readable explanation */
  explanation: z.string().optional(),
  /** Whether this requires manual verification */
  requiresReview: z.boolean().optional(),
});

/**
 * Autofill response for a form
 */
export const AutofillResponseSchema = z.object({
  /** Form identifier */
  formId: z.string(),
  /** List of field suggestions */
  suggestions: z.array(AutofillSuggestionSchema),
  /** Overall confidence for the autofill */
  overallConfidence: z.number().min(0).max(1),
  /** Fields that could not be autofilled */
  skippedFields: z.array(z.object({
    fieldId: z.string(),
    reason: z.string(),
  })).optional(),
  /** Warnings about the autofill */
  warnings: z.array(z.string()).optional(),
  /** Processing metadata */
  metadata: z.object({
    processingTimeMs: z.number().optional(),
    model: z.string().optional(),
    inputTokens: z.number().optional(),
  }).optional(),
}).describe('Autofill Response');

export type AutofillSuggestion = z.infer<typeof AutofillSuggestionSchema>;
export type AutofillResponse = z.infer<typeof AutofillResponseSchema>;

/**
 * Demographics autofill schema
 */
export const DemographicsAutofillSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  insuranceId: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
}).describe('Demographics Autofill');

export type DemographicsAutofill = z.infer<typeof DemographicsAutofillSchema>;

/**
 * Vitals autofill schema
 */
export const VitalsAutofillSchema = z.object({
  bloodPressureSystolic: z.number().positive().optional(),
  bloodPressureDiastolic: z.number().positive().optional(),
  heartRate: z.number().positive().optional(),
  temperature: z.number().positive().optional(),
  temperatureUnit: z.enum(['F', 'C']).optional(),
  respiratoryRate: z.number().positive().optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  height: z.number().positive().optional(),
  heightUnit: z.enum(['cm', 'in']).optional(),
  painLevel: z.number().min(0).max(10).optional(),
}).describe('Vitals Autofill');

export type VitalsAutofill = z.infer<typeof VitalsAutofillSchema>;

/**
 * Medication autofill schema
 */
export const MedicationAutofillSchema = z.object({
  medicationName: z.string(),
  genericName: z.string().optional(),
  dose: z.string(),
  unit: z.string(),
  route: z.enum(['oral', 'iv', 'im', 'sc', 'topical', 'inhaled', 'rectal', 'other']),
  frequency: z.string(),
  duration: z.string().optional(),
  indication: z.string().optional(),
  instructions: z.string().optional(),
  refills: z.number().int().min(0).optional(),
  dispenseQuantity: z.number().int().positive().optional(),
  substitutionAllowed: z.boolean().optional(),
}).describe('Medication Autofill');

export type MedicationAutofill = z.infer<typeof MedicationAutofillSchema>;
