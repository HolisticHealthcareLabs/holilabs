/**
 * SNCR Submission API
 *
 * POST /api/prescriptions/[id]/submit-sncr
 * Submit a signed prescription to ANVISA's SNCR (Sistema Nacional de Controle de Receitas).
 *
 * RUTH: Mandatory for controlled substances per RDC 1.000/2025.
 * CYRUS: Only the prescribing clinician or ADMIN can submit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { submitToSNCR } from '@/lib/brazil-interop/sncr-adapter';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const prescriptionId = context.params?.id;

      if (!prescriptionId) {
        return NextResponse.json(
          { error: 'Prescription ID is required' },
          { status: 400 }
        );
      }

      const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          patient: {
            select: { id: true, cpf: true, cns: true },
          },
          clinician: {
            select: { id: true, licenseNumber: true },
          },
        },
      });

      if (!prescription) {
        return NextResponse.json(
          { error: 'Prescription not found' },
          { status: 404 }
        );
      }

      // Only prescribing clinician or ADMIN can submit
      if (
        prescription.clinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Must be signed first
      if (prescription.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Prescription must be signed before SNCR submission' },
          { status: 422 }
        );
      }

      // Check if already submitted
      if (prescription.sncrId) {
        return NextResponse.json(
          {
            error: 'Prescription already submitted to SNCR',
            sncrId: prescription.sncrId,
            sncrStatus: prescription.sncrStatus,
          },
          { status: 409 }
        );
      }

      // SNCR not required for non-controlled prescriptions
      if (prescription.sncrStatus === 'NOT_REQUIRED') {
        return NextResponse.json(
          { error: 'SNCR submission is not required for this prescription type' },
          { status: 422 }
        );
      }

      const medications = prescription.medications as Array<{
        name: string;
        genericName?: string;
        dose: string;
        catmatCode?: string;
      }>;

      const result = await submitToSNCR({
        prescriptionId: prescription.id,
        prescriptionHash: prescription.prescriptionHash,
        prescriptionType: prescription.prescriptionType || 'BRANCA',
        controlledSchedule: prescription.controlledSubstanceClass,
        clinicianCrm: (prescription.clinician as any)?.licenseNumber || '',
        clinicianCpf: (prescription.clinician as any)?.cpf,
        patientCpf: (prescription.patient as any)?.cpf || '',
        patientCns: (prescription.patient as any)?.cns,
        medications: medications.map((med) => ({
          catmatCode: med.catmatCode || null,
          genericName: med.genericName || med.name,
          dose: med.dose,
          quantity: 1,
        })),
        signedAt: prescription.signedAt.toISOString(),
        digitalSignatureType: prescription.digitalSignatureType || prescription.signatureMethod,
        icpBrasilCertSerial: prescription.icpBrasilCertSerial || undefined,
        establishmentCnes: process.env.ESTABLISHMENT_CNES || '',
      });

      // Update prescription with SNCR response
      const sncrStatus = result.status === 'ACCEPTED' ? 'ACCEPTED'
        : result.status === 'REJECTED' ? 'REJECTED'
        : 'SUBMITTED';

      await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          sncrId: result.sncrId,
          sncrStatus,
          sncrSubmittedAt: new Date(),
          sncrResponseAt: result.sncrId ? new Date() : null,
          sncrErrorCode: result.errorCode,
        } as any,
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE' as any,
          resource: 'Prescription',
          resourceId: prescriptionId,
          details: {
            sncrId: result.sncrId,
            sncrStatus,
            prescriptionType: prescription.prescriptionType,
          },
          success: result.success,
        },
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'SNCR submission failed',
            sncrStatus,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        sncrId: result.sncrId,
        sncrStatus,
        message: 'Prescription submitted to SNCR successfully',
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to submit prescription to SNCR' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
    audit: { action: 'SUBMIT_SNCR', resource: 'Prescription' },
    skipCsrf: true,
  }
);
