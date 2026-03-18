/**
 * Escalation Resolve API Route
 *
 * POST /api/escalations/[id]/resolve - Mark escalation as resolved
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// =============================================================================
// POST /api/escalations/[id]/resolve - Resolve escalation
// =============================================================================

const ResolveBodySchema = z.object({
    notes: z.string().optional(),
});

async function handlePost(
    req: NextRequest,
    context: any & { params: { id: string } }
) {
    const { id } = context.params;
    const body = await req.json().catch(() => ({}));

    const parsed = ResolveBodySchema.safeParse(body);
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

    // Idempotent: if already resolved, return success
    if (escalation.status === 'RESOLVED') {
        return NextResponse.json({
            id: escalation.id,
            status: escalation.status,
            resolvedAt: escalation.resolvedAt,
            message: 'Escalation was already resolved',
        });
    }

    const updated: any = await prisma.escalation.update({
        where: { id },
        data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: context.userId,
        },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
        },
    });

    // Note: escalationNote functionality can be added when the model is defined in schema

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
                previousStatus: escalation.status,
                newStatus: 'RESOLVED',
                resolvedAt: updated.resolvedAt,
                notes: parsed.data.notes,
            },
        },
    });

    logger.info({
        event: 'api_escalations_resolve',
        escalationId: id,
        resolvedAt: updated.resolvedAt,
    });

    return NextResponse.json({
        id: updated.id,
        patientId: updated.patientId,
        patientName: updated.patient ? `${updated.patient.firstName} ${updated.patient.lastName}` : undefined,
        title: updated.title,
        category: updated.category,
        severity: updated.severity,
        status: updated.status,
        resolvedAt: updated.resolvedAt,
        resolvedBy: updated.resolvedBy,
    });
}

export const POST = createProtectedRoute(handlePost, { roles: ['ADMIN'] });
