"use strict";
/**
 * Appointments API
 * Industry-grade endpoint with full middleware stack
 *
 * POST /api/appointments - Create appointment
 * GET /api/appointments - List appointments with filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
// ============================================================================
// POST /api/appointments - Create appointment
// ============================================================================
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const validated = context.validatedBody;
    // Create appointment
    const appointment = await prisma_1.prisma.appointment.create({
        data: {
            patientId: validated.patientId,
            clinicianId: validated.clinicianId,
            title: validated.title,
            description: validated.description,
            startTime: new Date(validated.startTime),
            endTime: new Date(validated.endTime),
            timezone: validated.timezone,
            type: validated.type,
            meetingUrl: validated.meetingUrl,
            status: 'SCHEDULED',
        },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    tokenId: true,
                    email: true,
                    phone: true,
                },
            },
            clinician: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    specialty: true,
                },
            },
        },
    });
    // TODO: Send calendar invites (Google Calendar/Outlook integration)
    // TODO: Send SMS/Email reminders
    return server_1.NextResponse.json({
        success: true,
        data: appointment,
        message: 'Appointment created successfully',
    }, { status: 201 });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'], // Only clinicians can create appointments
    rateLimit: { windowMs: 60000, maxRequests: 30 }, // 30 requests per minute
    audit: { action: 'CREATE', resource: 'Appointment' },
});
// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper
// ============================================================================
// GET /api/appointments - List appointments
// ============================================================================
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const query = context.validatedQuery || {};
    // Build where clause
    const where = {};
    if (query.patientId)
        where.patientId = query.patientId;
    if (query.clinicianId)
        where.clinicianId = query.clinicianId;
    if (query.status)
        where.status = query.status;
    // Date range filter
    if (query.startDate || query.endDate) {
        where.startTime = {};
        if (query.startDate)
            where.startTime.gte = new Date(query.startDate);
        if (query.endDate)
            where.startTime.lte = new Date(query.endDate);
    }
    // If user is not admin, only show their appointments
    if (context.user?.role !== 'ADMIN') {
        where.clinicianId = context.user?.id;
    }
    const appointments = await prisma_1.prisma.appointment.findMany({
        where,
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    tokenId: true,
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
        orderBy: { startTime: 'desc' },
        take: query.limit || 50,
    });
    return server_1.NextResponse.json({
        success: true,
        data: appointments,
        count: appointments.length,
    });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'Appointment' },
    skipCsrf: true, // GET requests don't need CSRF protection
});
// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper
//# sourceMappingURL=route.js.map