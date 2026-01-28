/**
 * Single Medication API - DELETE endpoint
 * 
 * DELETE /api/patients/[id]/medications/[medicationId] - Soft delete (discontinue) medication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/patients/[id]/medications/[medicationId]
 * Soft delete (discontinue) a medication
 */
export const DELETE = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const { id: patientId, medicationId } = context.params;
            const { searchParams } = new URL(request.url);
            const reason = searchParams.get('reason') || 'Discontinued via API';

            // Verify medication exists and belongs to patient
            const medication = await prisma.medication.findFirst({
                where: {
                    id: medicationId,
                    patientId: patientId,
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            mrn: true,
                            assignedClinicianId: true,
                        },
                    },
                },
            });

            if (!medication) {
                return NextResponse.json(
                    { error: 'Medication not found' },
                    { status: 404 }
                );
            }

            // IDOR protection: verify user has access to this patient
            if (
                context.user.role !== 'ADMIN' &&
                medication.patient.assignedClinicianId !== context.user.id
            ) {
                return NextResponse.json(
                    { error: 'Forbidden: You cannot modify this medication' },
                    { status: 403 }
                );
            }

            // Already discontinued
            if (!medication.isActive) {
                return NextResponse.json(
                    { error: 'Medication is already discontinued' },
                    { status: 400 }
                );
            }

            // Soft delete - set isActive to false and record end date
            const discontinued = await prisma.medication.update({
                where: { id: medicationId },
                data: {
                    isActive: false,
                    endDate: new Date(),
                    notes: medication.notes
                        ? `${medication.notes}\n[Discontinued ${new Date().toISOString()}]: ${reason}`
                        : `[Discontinued ${new Date().toISOString()}]: ${reason}`,
                },
            });

            logger.info({
                event: 'medication_discontinued',
                medicationId,
                patientId,
                medicationName: medication.name,
                reason,
                userId: context.user.id,
            });

            return NextResponse.json({
                success: true,
                message: 'Medication discontinued successfully',
                data: {
                    id: discontinued.id,
                    name: medication.name,
                    previousStatus: 'ACTIVE',
                    newStatus: 'DISCONTINUED',
                    discontinuedAt: discontinued.endDate,
                    reason,
                },
            });
        } catch (error: any) {
            logger.error({
                event: 'medication_discontinue_failed',
                medicationId: context.params.medicationId,
                error: error.message,
            });
            return NextResponse.json(
                { error: 'Failed to discontinue medication' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN', 'CLINICIAN'],
        audit: { action: 'DELETE', resource: 'Medication' },
    }
);
