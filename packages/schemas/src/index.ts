import { z } from 'zod';

// Common schemas for API validation
export const PatientTokenSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  pointerHash: z.string(),
});

export const DatasetSchema = z.object({
  id: z.string().uuid(),
  patientTokenId: z.string().uuid(),
  sha256: z.string(),
  policyVersion: z.string(),
});

export type PatientToken = z.infer<typeof PatientTokenSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
