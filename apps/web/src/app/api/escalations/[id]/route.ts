/**
 * Escalation Detail API Routes
 *
 * PATCH /api/escalations/[id] - Assign or update escalation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// =============================================================================
// PATCH /api/escalations/[id] - Assign escalation
// =============================================================================

const UpdateBodySchema = z.object({
    assignedToId: z.string().uuid().describe('User ID to assign to'),
});

async function handlePatch(
    req: NextRequest,
    context: any & { params: { id: string } }
) {
    const { id } = context.params;
    const body = await req.json();

    const parsed = UpdateBodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: `Invalid request body: ${parsed.error.errors.map(e => e.message).join(', ')}` },
            { status: 400 }
        );
    }

    const escalation: any = await prisma.escalation.findUnique({
        where: { id },
    });

    if (!escalation) {
        return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
    }

    if (escalation.status === 'RESOLVED') {
        return NextResponse.json(
            { error: 'Cannot assign resolved escalation' },
            { status: 409 }
        );
    }

    const updated: any = await prisma.escalation.update({
        where: { id },
        data: {
            assignedToId: parsed.data.assignedToId,
            assignedAt: new Date(),
            status: 'ASSIGNED',
        },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
            assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: context.userId,
            action: 'UPDATE',
            resource: 'Escalation',
            resourceId: updated.id,
            success: true,
            ipAddress: context.ipAddress || 'unknown',
            details: {
                escalationId: updated.id,
                assignedToId: parsed.data.assignedToId,
                previousStatus: escalation.status,
                newStatus: 'ASSIGNED',
            },
        },
    });

    logger.info({
        event: 'api_escalations_assign',
        escalationId: id,
        assignedToId: parsed.data.assignedToId,
    });

    return NextResponse.json({
        id: updated.id,
        patientId: updated.patientId,
        patientName: updated.patient ? `${updated.patient.firstName} ${updated.patient.lastName}` : undefined,
        title: updated.title,
        category: updated.category,
        severity: updated.severity,
        status: updated.status,
        assignedTo: updated.assignedTo,
        assignedAt: updated.assignedAt,
        slaDeadline: updated.slaDeadline,
    });
}

export const PATCH = createProtectedRoute(handlePatch, { roles: ['ADMIN'] });
