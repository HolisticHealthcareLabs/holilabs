/**
 * Escalation Management API Routes
 *
 * GET  /api/escalations - List escalations (with filtering and pagination)
 * POST /api/escalations - Create a new escalation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// =============================================================================
// GET /api/escalations - List escalations
// =============================================================================

const ListQuerySchema = z.object({
    patientId: z.string().optional(),
    status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED']).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    category: z.enum(['CLINICAL', 'REVENUE', 'OPERATIONAL', 'SECURITY', 'ADMINISTRATIVE']).optional(),
    assignedToId: z.string().optional(),
    skip: z.coerce.number().int().min(0).default(0),
    take: z.coerce.number().int().min(1).max(100).default(20),
});

async function handleGet(req: NextRequest) {
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams);

    const parsed = ListQuerySchema.safeParse(query);
    if (!parsed.success) {
        return NextResponse.json(
            { error: `Invalid query parameters: ${parsed.error.errors.map(e => e.message).join(', ')}` },
            { status: 400 }
        );
    }

    const where: any = {};

    if (parsed.data.patientId) where.patientId = parsed.data.patientId;
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.severity) where.severity = parsed.data.severity;
    if (parsed.data.category) where.category = parsed.data.category;
    if (parsed.data.assignedToId) where.assignedToId = parsed.data.assignedToId;

    const escalations: any[] = await prisma.escalation.findMany({
        where,
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
            assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
        skip: parsed.data.skip,
        take: parsed.data.take,
        orderBy: { createdAt: 'desc' },
    });

    const total = await (prisma.escalation as any).count({ where });

    logger.info({
        event: 'api_escalations_list',
        count: escalations.length,
        total,
    });

    return NextResponse.json({
        escalations: escalations.map(e => ({
            id: e.id,
            patientId: e.patientId,
            patientName: e.patient ? `${e.patient.firstName} ${e.patient.lastName}` : undefined,
            title: e.title,
            category: e.category,
            severity: e.severity,
            status: e.status,
            escalationLevel: e.escalationLevel,
            assignedTo: e.assignedTo,
            slaDeadline: e.slaDeadline,
            createdAt: e.createdAt,
        })),
        pagination: {
            skip: parsed.data.skip,
            take: parsed.data.take,
            total,
            hasMore: parsed.data.skip + parsed.data.take < total,
        },
    });
}

// =============================================================================
// POST /api/escalations - Create escalation
// =============================================================================

const CreateBodySchema = z.object({
    patientId: z.string().uuid(),
    encounterId: z.string().optional(),
    title: z.string().min(1).max(200),
    description: z.string(),
    category: z.enum(['CLINICAL', 'REVENUE', 'OPERATIONAL', 'SECURITY', 'ADMINISTRATIVE']),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    slaDeadlineHours: z.number().int().optional(),
    escalationLevel: z.number().int().min(1).max(5).default(1),
    notificationChannels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS'])).default(['IN_APP']),
});

async function handlePost(req: NextRequest, context: any) {
    const body = await req.json();

    const parsed = CreateBodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: `Invalid request body: ${parsed.error.errors.map(e => e.message).join(', ')}` },
            { status: 400 }
        );
    }

    const slaDeadline = parsed.data.slaDeadlineHours
        ? new Date(Date.now() + parsed.data.slaDeadlineHours * 3600 * 1000)
        : null;

    const escalation: any = await prisma.escalation.create({
        data: {
            patientId: parsed.data.patientId,
            encounterId: parsed.data.encounterId,
            title: parsed.data.title,
            description: parsed.data.description,
            category: parsed.data.category,
            severity: parsed.data.severity,
            slaDeadlineHours: parsed.data.slaDeadlineHours,
            slaDeadline,
            escalationLevel: parsed.data.escalationLevel,
            notificationChannels: parsed.data.notificationChannels,
            createdBy: context.userId,
            status: 'PENDING',
        },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: context.userId,
            action: 'CREATE',
            resource: 'Escalation',
            resourceId: escalation.id,
            success: true,
            ipAddress: context.ipAddress || 'unknown',
            details: {
                escalationId: escalation.id,
                patientId: parsed.data.patientId,
                category: parsed.data.category,
                severity: parsed.data.severity,
            },
        },
    });

    logger.info({
        event: 'api_escalations_create',
        escalationId: escalation.id,
        category: parsed.data.category,
        severity: parsed.data.severity,
    });

    return NextResponse.json(
        {
            id: escalation.id,
            patientId: escalation.patientId,
            patientName: escalation.patient ? `${escalation.patient.firstName} ${escalation.patient.lastName}` : undefined,
            title: escalation.title,
            category: escalation.category,
            severity: escalation.severity,
            status: escalation.status,
            escalationLevel: escalation.escalationLevel,
            slaDeadline: escalation.slaDeadline,
            createdAt: escalation.createdAt,
        },
        { status: 201 }
    );
}

export const GET = createProtectedRoute({ roles: ['ADMIN'] })(handleGet);
export const POST = createProtectedRoute({ roles: ['ADMIN'] })(handlePost);
