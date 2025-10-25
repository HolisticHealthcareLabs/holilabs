"use strict";
/**
 * Data Access Grants API
 * HIPAA-compliant patient data access control
 *
 * GET /api/access-grants - List access grants for a patient
 * POST /api/access-grants - Create new access grant
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/access-grants
 * List access grants for a patient with filtering
 * Query params: patientId (required), status (active/revoked/all), resourceType
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId');
        const status = searchParams.get('status') || 'active'; // active, revoked, all
        const resourceType = searchParams.get('resourceType');
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'patientId query parameter is required' }, { status: 400 });
        }
        // Build filter
        const where = { patientId };
        // Filter by status
        if (status === 'active') {
            where.revokedAt = null;
            where.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ];
        }
        else if (status === 'revoked') {
            where.revokedAt = { not: null };
        }
        else if (status === 'expired') {
            where.revokedAt = null;
            where.expiresAt = { lte: new Date() };
        }
        // Filter by resource type
        if (resourceType) {
            where.resourceType = resourceType;
        }
        // Fetch grants with related data
        const accessGrants = await prisma_1.prisma.dataAccessGrant.findMany({
            where,
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        mrn: true,
                    },
                },
                grantedToUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                labResult: {
                    select: {
                        id: true,
                        testName: true,
                        resultDate: true,
                    },
                },
                imagingStudy: {
                    select: {
                        id: true,
                        modality: true,
                        description: true,
                        studyDate: true,
                    },
                },
            },
            orderBy: [
                { grantedAt: 'desc' },
            ],
        });
        // Enrich with computed fields
        const enrichedGrants = accessGrants.map((grant) => {
            const now = new Date();
            const isExpired = grant.expiresAt ? grant.expiresAt <= now : false;
            const isRevoked = grant.revokedAt !== null;
            const isActive = !isExpired && !isRevoked;
            return {
                ...grant,
                isActive,
                isExpired,
                isRevoked,
            };
        });
        return server_1.NextResponse.json({
            success: true,
            data: enrichedGrants,
            count: enrichedGrants.length,
        });
    }
    catch (error) {
        console.error('Error fetching access grants:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch access grants', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
});
/**
 * POST /api/access-grants
 * Create new access grant
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { patientId, grantedToType, grantedToId, grantedToEmail, grantedToName, resourceType, resourceId, labResultId, imagingStudyId, canView = true, canDownload = false, canShare = false, expiresAt, purpose, consentFormId, } = body;
        // Validate required fields
        if (!patientId || !grantedToType || !resourceType) {
            return server_1.NextResponse.json({ error: 'Missing required fields: patientId, grantedToType, resourceType' }, { status: 400 });
        }
        // Validate grantedToType has appropriate identifier
        if (grantedToType === 'USER' && !grantedToId) {
            return server_1.NextResponse.json({ error: 'grantedToId is required for USER type' }, { status: 400 });
        }
        if (grantedToType === 'EXTERNAL' && (!grantedToEmail || !grantedToName)) {
            return server_1.NextResponse.json({ error: 'grantedToEmail and grantedToName are required for EXTERNAL type' }, { status: 400 });
        }
        // Validate resource exists
        if (resourceType === 'LAB_RESULT' && labResultId) {
            const labResult = await prisma_1.prisma.labResult.findUnique({
                where: { id: labResultId },
            });
            if (!labResult || labResult.patientId !== patientId) {
                return server_1.NextResponse.json({ error: 'Lab result not found or does not belong to patient' }, { status: 404 });
            }
        }
        if (resourceType === 'IMAGING_STUDY' && imagingStudyId) {
            const imagingStudy = await prisma_1.prisma.imagingStudy.findUnique({
                where: { id: imagingStudyId },
            });
            if (!imagingStudy || imagingStudy.patientId !== patientId) {
                return server_1.NextResponse.json({ error: 'Imaging study not found or does not belong to patient' }, { status: 404 });
            }
        }
        // Check for duplicate active grants
        const existingGrant = await prisma_1.prisma.dataAccessGrant.findFirst({
            where: {
                patientId,
                grantedToType,
                grantedToId: grantedToId || null,
                grantedToEmail: grantedToEmail || null,
                resourceType,
                resourceId: resourceId || null,
                labResultId: labResultId || null,
                imagingStudyId: imagingStudyId || null,
                revokedAt: null,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });
        if (existingGrant) {
            return server_1.NextResponse.json({ error: 'Active grant already exists for this resource and recipient' }, { status: 409 });
        }
        // Create the grant
        const accessGrant = await prisma_1.prisma.dataAccessGrant.create({
            data: {
                patientId,
                grantedToType,
                grantedToId: grantedToId || null,
                grantedToEmail: grantedToEmail || null,
                grantedToName: grantedToName || null,
                resourceType,
                resourceId: resourceId || null,
                labResultId: labResultId || null,
                imagingStudyId: imagingStudyId || null,
                canView,
                canDownload,
                canShare,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                purpose: purpose || null,
                consentFormId: consentFormId || null,
            },
            include: {
                patient: {
                    select: {
                        firstName: true,
                        lastName: true,
                        mrn: true,
                    },
                },
                grantedToUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: context.user.id,
                userEmail: context.user.email || 'unknown',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'DataAccessGrant',
                resourceId: accessGrant.id,
                details: {
                    patientId,
                    grantedToType,
                    grantedToId: grantedToId || grantedToEmail,
                    resourceType,
                    permissions: { canView, canDownload, canShare },
                },
                success: true,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: accessGrant,
            message: 'Access grant created successfully',
        });
    }
    catch (error) {
        console.error('Error creating access grant:', error);
        return server_1.NextResponse.json({ error: 'Failed to create access grant', message: error.message }, { status: 500 });
    }
}, {
    roles: ['ADMIN', 'CLINICIAN', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
});
//# sourceMappingURL=route.js.map