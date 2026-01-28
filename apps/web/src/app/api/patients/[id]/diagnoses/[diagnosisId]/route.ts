/**
 * Single Diagnosis API - DELETE endpoint
 * 
 * DELETE /api/patients/[id]/diagnoses/[diagnosisId] - Soft delete (resolve) diagnosis
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/patients/[id]/diagnoses/[diagnosisId]
 * Soft delete (resolve) a diagnosis
 */
export const DELETE = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const { id: patientId, diagnosisId } = context.params;
            const { searchParams } = new URL(request.url);
            const reason = searchParams.get('reason') || 'Resolved via API';

            // Verify diagnosis exists and belongs to patient
            const diagnosis: any = await prisma.diagnosis.findFirst({
                where: {
                    id: diagnosisId,
                    patientId: patientId,
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            assignedClinicianId: true,
                        },
                    },
                },
            });

            if (!diagnosis) {
                return NextResponse.json(
                    { error: 'Diagnosis not found' },
                    { status: 404 }
                );
            }

            // IDOR protection
            if (
                context.user.role !== 'ADMIN' &&
                diagnosis.patient.assignedClinicianId !== context.user.id
            ) {
                return NextResponse.json(
                    { error: 'Forbidden: You cannot modify this diagnosis' },
                    { status: 403 }
                );
            }

            // Already resolved
            if (diagnosis.status === 'RESOLVED') {
                return NextResponse.json(
                    { error: 'Diagnosis is already marked as resolved' },
                    { status: 400 }
                );
            }

            // Soft delete - set status to RESOLVED
            const resolved: any = await prisma.diagnosis.update({
                where: { id: diagnosisId },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                    notes: diagnosis.notes
                        ? `${diagnosis.notes}\n[Resolved ${new Date().toISOString()}]: ${reason}`
                        : `[Resolved ${new Date().toISOString()}]: ${reason}`,
                },
            });

            logger.info({
                event: 'diagnosis_resolved',
                diagnosisId,
                patientId,
                icd10Code: diagnosis.icd10Code,
                reason,
                userId: context.user.id,
            });

            return NextResponse.json({
                success: true,
                message: 'Diagnosis marked as resolved',
                data: {
                    id: resolved.id,
                    icd10Code: diagnosis.icd10Code,
                    name: diagnosis.name,
                    previousStatus: diagnosis.status,
                    newStatus: 'RESOLVED',
                    resolvedAt: resolved.resolvedAt,
                    reason,
                },
            });
        } catch (error: any) {
            logger.error({
                event: 'diagnosis_resolve_failed',
                diagnosisId: context.params.diagnosisId,
                error: error.message,
            });
            return NextResponse.json(
                { error: 'Failed to resolve diagnosis' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN', 'CLINICIAN'],
        audit: { action: 'DELETE', resource: 'Diagnosis' },
    }
);
