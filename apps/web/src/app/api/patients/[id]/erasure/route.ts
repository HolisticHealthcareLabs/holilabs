/**
 * LGPD Art. 18 (VI) — Cryptographic Erasure / PII Anonymization
 *
 * POST /api/patients/[id]/erasure
 * Executes hard delete: anonymizes all PII fields, destroys re-identification keys.
 * Audit logs are RETAINED per legal obligation (LGPD Art. 37).
 *
 * @compliance LGPD Art. 18 (VI), Art. 37 (record keeping)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const ERASED_SENTINEL = '[ERASED]';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    const user = context.user;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only ADMIN can execute patient erasure' },
        { status: 403 }
      );
    }

    // CYRUS: tenant isolation — even ADMIN must have access to this patient (CVI-002)
    const hasAccess = await verifyPatientAccess(user.id, patientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this patient record' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { type = 'soft', confirmationToken } = body;

    if (!confirmationToken) {
      return NextResponse.json(
        { error: 'confirmationToken is required to execute erasure' },
        { status: 400 }
      );
    }

    // Verify deletion request exists and token matches
    const deletionRequest = await prisma.deletionRequest.findFirst({
      where: { patientId, confirmationToken } as any,
    });

    if (!deletionRequest) {
      return NextResponse.json(
        { error: 'No matching deletion request found' },
        { status: 404 }
      );
    }

    if (type === 'soft') {
      // SOFT DELETE: set deletedAt, preserve audit logs, retain consents for legal disputes
      await prisma.patient.update({
        where: { id: patientId },
        data: { deletedAt: new Date() } as any,
      });

      await prisma.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: 'COMPLETED' } as any,
      });

      return NextResponse.json({ success: true, type: 'soft', patientId }, { status: 200 });
    }

    // HARD DELETE: anonymize all PII fields, wipe re-identification keys, delete consents
    await prisma.$transaction(async (tx) => {
      // Anonymize patient PII
      await tx.patient.update({
        where: { id: patientId },
        data: {
          firstName: ERASED_SENTINEL,
          lastName: ERASED_SENTINEL,
          email: `erased-${patientId}@erased.invalid`,
          phone: ERASED_SENTINEL,
          cpf: ERASED_SENTINEL,
          cns: ERASED_SENTINEL,
          rg: ERASED_SENTINEL,
          deletedAt: new Date(),
        } as any,
      });

      // Anonymize prescriptions (preserve prescriptionHash for audit)
      await tx.prescription.updateMany({
        where: { patientId },
        data: { patientName: ERASED_SENTINEL } as any,
      });

      // Nullify clinical notes content
      await tx.clinicalNote.updateMany({
        where: { patientId },
        data: {
          subjective: ERASED_SENTINEL,
          objective: ERASED_SENTINEL,
          assessment: ERASED_SENTINEL,
          plan: ERASED_SENTINEL,
        } as any,
      });

      // Destroy re-identification token maps
      await tx.tokenMap.deleteMany({
        where: { recordId: patientId } as any,
      });

      // Hard delete consents (legal obligation fulfilled, no longer needed)
      await tx.consent.deleteMany({
        where: { patientId },
      });

      // Mark deletion request as completed
      await tx.deletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: 'COMPLETED' } as any,
      });
    });

    // NOTE: auditLog records are NOT deleted (retained per LGPD Art. 37)

    return NextResponse.json({ success: true, type: 'hard', patientId }, { status: 200 });
  },
  { roles: ['ADMIN'], skipCsrf: true }
);
