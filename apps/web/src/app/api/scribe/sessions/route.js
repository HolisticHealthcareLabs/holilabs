"use strict";
/**
 * Scribe Sessions API
 *
 * POST /api/scribe/sessions - Create new scribe session
 * GET  /api/scribe/sessions - List scribe sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
exports.dynamic = 'force-dynamic';
/**
 * POST /api/scribe/sessions
 * Create a new scribe session (start recording)
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        const { patientId, appointmentId } = body;
        if (!patientId) {
            return server_1.NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
        }
        // SECURITY: Verify clinician has access to this patient
        const patient = await prisma_1.prisma.patient.findFirst({
            where: {
                id: patientId,
                assignedClinicianId: context.user.id,
            },
        });
        if (!patient) {
            return server_1.NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
        }
        // Verify appointment if provided
        if (appointmentId) {
            const appointment = await prisma_1.prisma.appointment.findFirst({
                where: {
                    id: appointmentId,
                    clinicianId: context.user.id,
                    patientId,
                },
            });
            if (!appointment) {
                return server_1.NextResponse.json({ error: 'Appointment not found or access denied' }, { status: 404 });
            }
        }
        // Create scribe session
        const session = await prisma_1.prisma.scribeSession.create({
            data: {
                patientId,
                clinicianId: context.user.id,
                appointmentId,
                status: 'RECORDING',
                transcriptionModel: 'whisper-1',
                soapModel: 'claude-3-5-sonnet-20250219',
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        mrn: true,
                        tokenId: true,
                        dateOfBirth: true,
                    },
                },
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                    },
                },
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: session,
        });
    }
    catch (error) {
        console.error('Error creating scribe session:', error);
        return server_1.NextResponse.json({ error: 'Failed to create scribe session', message: error.message }, { status: 500 });
    }
});
/**
 * GET /api/scribe/sessions
 * List scribe sessions with pagination
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { searchParams } = new URL(request.url);
        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;
        // Filters
        const patientId = searchParams.get('patientId');
        const status = searchParams.get('status');
        // Build where clause with tenant isolation
        const where = {
            clinicianId: context.user.id, // CRITICAL: Only show this clinician's sessions
        };
        if (patientId) {
            where.patientId = patientId;
        }
        if (status) {
            where.status = status;
        }
        // Execute query
        const [sessions, total] = await Promise.all([
            prisma_1.prisma.scribeSession.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            mrn: true,
                            tokenId: true,
                        },
                    },
                    transcription: {
                        select: {
                            id: true,
                            confidence: true,
                            wordCount: true,
                            durationSeconds: true,
                        },
                    },
                    soapNote: {
                        select: {
                            id: true,
                            status: true,
                            overallConfidence: true,
                            signedAt: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.scribeSession.count({ where }),
        ]);
        return server_1.NextResponse.json({
            success: true,
            data: sessions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error fetching scribe sessions:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch scribe sessions', message: error.message }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map