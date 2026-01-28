/**
 * Single Allergy API - DELETE endpoint
 * 
 * DELETE /api/patients/[id]/allergies/[allergyId] - Soft delete (resolve) allergy
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/patients/[id]/allergies/[allergyId]
 * Soft delete (resolve/mark inactive) an allergy
 */
export const DELETE = createProtectedRoute(
    async (request: NextRequest, context: any) => {
        try {
            const { id: patientId, allergyId } = context.params;
            const { searchParams } = new URL(request.url);
            const reason = searchParams.get('reason') || 'Resolved via API';

            // Verify allergy exists and belongs to patient
            const allergy = await prisma.allergy.findFirst({
                where: {
                    id: allergyId,
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

            if (!allergy) {
                return NextResponse.json(
                    { error: 'Allergy not found' },
                    { status: 404 }
                );
            }

            // IDOR protection
            if (
                context.user.role !== 'ADMIN' &&
                allergy.patient.assignedClinicianId !== context.user.id
            ) {
                return NextResponse.json(
                    { error: 'Forbidden: You cannot modify this allergy record' },
                    { status: 403 }
                );
            }

            // Already inactive
            if (!allergy.isActive) {
                return NextResponse.json(
                    { error: 'Allergy is already marked as inactive/resolved' },
                    { status: 400 }
                );
            }

            // Soft delete - set isActive to false
            const resolved = await prisma.allergy.update({
                where: { id: allergyId },
                data: {
                    isActive: false,
                    resolvedAt: new Date(),
                    resolvedBy: context.user.id,
                    notes: allergy.notes
                        ? `${allergy.notes}\n[Resolved ${new Date().toISOString()}]: ${reason}`
                        : `[Resolved ${new Date().toISOString()}]: ${reason}`,
                },
            });

            logger.info({
                event: 'allergy_resolved',
                allergyId,
                patientId,
                allergen: allergy.allergen,
                reason,
                userId: context.user.id,
            });

            return NextResponse.json({
                success: true,
                message: 'Allergy marked as resolved',
                data: {
                    id: resolved.id,
                    allergen: allergy.allergen,
                    previousStatus: 'ACTIVE',
                    newStatus: 'RESOLVED',
                    resolvedAt: resolved.resolvedAt,
                    resolvedBy: context.user.id,
                    reason,
                },
            });
        } catch (error: any) {
            logger.error({
                event: 'allergy_resolve_failed',
                allergyId: context.params.allergyId,
                error: error.message,
            });
            return NextResponse.json(
                { error: 'Failed to resolve allergy' },
                { status: 500 }
            );
        }
    },
    {
        roles: ['ADMIN', 'CLINICIAN'],
        audit: { action: 'DELETE', resource: 'Allergy' },
    }
);
