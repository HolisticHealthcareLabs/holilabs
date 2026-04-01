/**
 * FHIR R4 Export Route
 *
 * Accepts a validated clinical payload, constructs a FHIR R4 transaction
 * Bundle via the shared-kernel mapper, and pushes it to a simulated
 * legacy EHR endpoint with Bearer token authorization.
 *
 * Owner: ARCHIE (route architecture)
 * Co-sign: RUTH (audit logging on every export attempt, success or failure)
 * Co-sign: GORDON (CBHPM/TUSS billing system alignment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import {
  buildFhirBundle,
  type FhirExportPayload,
} from '../../../../../../../../packages/shared-kernel/src/clinical/fhir-mapper';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const DiagnosisSchema = z.object({
  code: z.string().min(1, 'ICD-10 code is required'),
  name: z.string().min(1, 'Diagnosis name is required'),
  type: z.enum(['primary', 'secondary', 'complication']),
});

const BillingCodeSchema = z.object({
  code: z.string().min(1, 'Billing code is required'),
  name: z.string().min(1, 'Service name is required'),
  system: z.enum(['CBHPM', 'TUSS']),
  estimatedValueBRL: z.number().min(0),
});

const FhirExportRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient identifier is required'),
  providerId: z.string().min(1, 'Provider identifier is required'),
  soapNote: z.string().min(1, 'SOAP note content is required').max(30000),
  diagnoses: z.array(DiagnosisSchema).min(1, 'At least one diagnosis is required'),
  billingCodes: z.array(BillingCodeSchema).min(1, 'At least one billing code is required'),
});

const EHR_MOCK_ENDPOINT = 'https://ehr.hospital-mock.com/fhir';
const EHR_MOCK_BEARER_TOKEN = (() => {
  const token = process.env.EHR_BEARER_TOKEN;
  if (!token && process.env.NODE_ENV === 'production') {
    throw new Error('EHR_BEARER_TOKEN must be set in production (CVI-006)');
  }
  return token || 'mock-bearer-token-dev-only';
})();

export const POST = createProtectedRoute(
  async (request: NextRequest) => {
    const startTime = Date.now();
    let validatedPayload: z.infer<typeof FhirExportRequestSchema> | null = null;

    try {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON body' },
          { status: 400 },
        );
      }

      const validation = FhirExportRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payload validation failed',
            details: validation.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }

      validatedPayload = validation.data;

      const exportPayload: FhirExportPayload = {
        patientId: validatedPayload.patientId,
        providerId: validatedPayload.providerId,
        soapNote: validatedPayload.soapNote,
        diagnoses: validatedPayload.diagnoses,
        billingCodes: validatedPayload.billingCodes,
      };

      const fhirBundle = buildFhirBundle(exportPayload);

      let ehrStatusCode = 200;
      let ehrSuccess = true;
      let ehrErrorMessage: string | undefined;

      try {
        const ehrResponse = await fetch(EHR_MOCK_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/fhir+json',
            Authorization: `Bearer ${EHR_MOCK_BEARER_TOKEN}`,
            'X-Cortex-Request-Id': crypto.randomUUID(),
          },
          body: JSON.stringify(fhirBundle),
          signal: AbortSignal.timeout(15000),
        });

        ehrStatusCode = ehrResponse.status;
        ehrSuccess = ehrResponse.ok;

        if (!ehrResponse.ok) {
          const responseText = await ehrResponse.text().catch(() => 'Unable to read response');
          ehrErrorMessage = `EHR responded with HTTP ${ehrStatusCode}: ${responseText.slice(0, 500)}`;
        }
      } catch (fetchError) {
        ehrSuccess = false;
        ehrStatusCode = 0;
        ehrErrorMessage =
          fetchError instanceof Error
            ? fetchError.message
            : 'Unknown error during EHR push';

        logger.warn({
          event: 'fhir_export_ehr_unreachable',
          endpoint: EHR_MOCK_ENDPOINT,
          error: ehrErrorMessage,
        });
      }

      const durationMs = Date.now() - startTime;

      await createAuditLog(
        {
          action: 'EXPORT',
          resource: 'FhirBundle',
          resourceId: validatedPayload.patientId,
          details: {
            providerId: validatedPayload.providerId,
            bundleEntryCount: fhirBundle.entry.length,
            diagnosesCount: validatedPayload.diagnoses.length,
            billingCodesCount: validatedPayload.billingCodes.length,
            ehrEndpoint: EHR_MOCK_ENDPOINT,
            ehrStatusCode,
            durationMs,
          },
          success: ehrSuccess,
          errorMessage: ehrErrorMessage,
          accessReason: 'TREATMENT',
          accessPurpose: 'FHIR R4 bundle export to enterprise EHR',
        },
        request,
      );

      logger.info({
        event: 'fhir_export_complete',
        patientId: validatedPayload.patientId,
        providerId: validatedPayload.providerId,
        ehrStatusCode,
        ehrSuccess,
        bundleEntryCount: fhirBundle.entry.length,
        durationMs,
      });

      if (!ehrSuccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'EHR export failed',
            ehrStatusCode,
            message: ehrErrorMessage,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          bundleTimestamp: fhirBundle.timestamp,
          entryCount: fhirBundle.entry.length,
          ehrStatusCode,
        },
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;

      logger.error({
        event: 'fhir_export_unhandled_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      });

      await createAuditLog(
        {
          action: 'EXPORT',
          resource: 'FhirBundle',
          resourceId: validatedPayload?.patientId ?? 'unknown',
          details: {
            ehrEndpoint: EHR_MOCK_ENDPOINT,
            durationMs,
          },
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unhandled server error',
          accessReason: 'TREATMENT',
          accessPurpose: 'FHIR R4 bundle export to enterprise EHR',
        },
        request,
      );

      return NextResponse.json(
        { success: false, error: 'Internal server error during FHIR export' },
        { status: 500 },
      );
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
