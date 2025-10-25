"use strict";
/**
 * Analytics API
 * Real-time metrics and reporting for dashboard
 *
 * GET /api/analytics?metric=patient_count&startDate=...&endDate=...
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
// Force dynamic rendering - prevents build-time evaluation
exports.dynamic = 'force-dynamic';
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const query = context.validatedQuery;
    const metric = query.metric;
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const clinicianId = query.clinicianId;
    let result = {};
    // Build where clause for clinician filter
    const clinicianWhere = clinicianId ? { assignedClinicianId: clinicianId } : {};
    const appointmentWhere = clinicianId ? { clinicianId } : {};
    switch (metric) {
        // =====================================================================
        // PATIENT METRICS
        // =====================================================================
        case 'patient_count':
            const totalPatients = await prisma_1.prisma.patient.count({
                where: {
                    ...clinicianWhere,
                    createdAt: { gte: startDate, lte: endDate },
                },
            });
            const activePatients = await prisma_1.prisma.patient.count({
                where: {
                    ...clinicianWhere,
                    isActive: true,
                    createdAt: { gte: startDate, lte: endDate },
                },
            });
            // Get trend (compare to previous period)
            const previousPeriodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const previousStart = new Date(startDate.getTime() - previousPeriodDays * 24 * 60 * 60 * 1000);
            const previousPatients = await prisma_1.prisma.patient.count({
                where: {
                    ...clinicianWhere,
                    createdAt: { gte: previousStart, lt: startDate },
                },
            });
            const trend = totalPatients - previousPatients;
            const trendPercentage = previousPatients > 0 ? ((trend / previousPatients) * 100).toFixed(1) : '0';
            result = {
                metric: 'patient_count',
                total: totalPatients,
                active: activePatients,
                inactive: totalPatients - activePatients,
                trend: {
                    value: trend,
                    percentage: trendPercentage,
                    direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
                },
                period: { startDate, endDate },
            };
            break;
        // =====================================================================
        // APPOINTMENT METRICS
        // =====================================================================
        case 'appointments_today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const todayAppointments = await prisma_1.prisma.appointment.findMany({
                where: {
                    ...appointmentWhere,
                    startTime: { gte: today, lt: tomorrow },
                },
                include: {
                    patient: {
                        select: {
                            firstName: true,
                            lastName: true,
                            tokenId: true,
                        },
                    },
                },
                orderBy: { startTime: 'asc' },
            });
            const appointmentsByStatus = await prisma_1.prisma.appointment.groupBy({
                by: ['status'],
                where: {
                    ...appointmentWhere,
                    startTime: { gte: today, lt: tomorrow },
                },
                _count: true,
            });
            result = {
                metric: 'appointments_today',
                total: todayAppointments.length,
                appointments: todayAppointments,
                byStatus: appointmentsByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count;
                    return acc;
                }, {}),
            };
            break;
        // =====================================================================
        // PRESCRIPTION METRICS
        // =====================================================================
        case 'prescriptions_today':
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const prescriptions = await prisma_1.prisma.prescription.count({
                where: {
                    ...(clinicianId ? { clinicianId } : {}),
                    createdAt: { gte: todayStart },
                },
            });
            const byStatus = await prisma_1.prisma.prescription.groupBy({
                by: ['status'],
                where: {
                    ...(clinicianId ? { clinicianId } : {}),
                    createdAt: { gte: todayStart },
                },
                _count: true,
            });
            result = {
                metric: 'prescriptions_today',
                total: prescriptions,
                byStatus: byStatus.reduce((acc, item) => {
                    acc[item.status] = item._count;
                    return acc;
                }, {}),
            };
            break;
        // =====================================================================
        // CLINICAL NOTES METRICS
        // =====================================================================
        case 'clinical_notes_count':
            const notes = await prisma_1.prisma.clinicalNote.count({
                where: {
                    ...(clinicianId ? { authorId: clinicianId } : {}),
                    createdAt: { gte: startDate, lte: endDate },
                },
            });
            // @ts-ignore - Prisma groupBy type inference issue with spread operator
            const byType = await prisma_1.prisma.clinicalNote.groupBy({
                by: ['type'],
                where: {
                    ...(clinicianId && { authorId: clinicianId }),
                    createdAt: { gte: startDate, lte: endDate },
                },
                _count: true,
            });
            result = {
                metric: 'clinical_notes_count',
                total: notes,
                byType: byType.reduce((acc, item) => {
                    acc[item.type] = item._count;
                    return acc;
                }, {}),
                period: { startDate, endDate },
            };
            break;
        // =====================================================================
        // MEDICATION METRICS
        // =====================================================================
        case 'active_medications':
            const activeMeds = await prisma_1.prisma.medication.count({
                where: {
                    isActive: true,
                    ...(clinicianId ? { prescribedBy: clinicianId } : {}),
                },
            });
            // Top 10 prescribed medications
            const topMedications = await prisma_1.prisma.medication.groupBy({
                by: ['name'],
                where: {
                    isActive: true,
                    ...(clinicianId ? { prescribedBy: clinicianId } : {}),
                },
                _count: true,
                orderBy: {
                    _count: {
                        name: 'desc',
                    },
                },
                take: 10,
            });
            result = {
                metric: 'active_medications',
                total: activeMeds,
                topMedications: topMedications.map((m) => ({
                    name: m.name,
                    count: m._count,
                })),
            };
            break;
        // =====================================================================
        // CONSENT COMPLIANCE
        // =====================================================================
        case 'consent_compliance':
            const totalPatientsForConsent = await prisma_1.prisma.patient.count({
                where: { ...clinicianWhere, isActive: true },
            });
            const patientsWithConsent = await prisma_1.prisma.consent.findMany({
                where: { isActive: true },
                distinct: ['patientId'],
                select: { patientId: true },
            });
            const complianceRate = totalPatientsForConsent > 0
                ? ((patientsWithConsent.length / totalPatientsForConsent) * 100).toFixed(1)
                : '0';
            const consentsByType = await prisma_1.prisma.consent.groupBy({
                by: ['type'],
                where: { isActive: true },
                _count: true,
            });
            result = {
                metric: 'consent_compliance',
                totalPatients: totalPatientsForConsent,
                patientsWithConsent: patientsWithConsent.length,
                complianceRate: `${complianceRate}%`,
                byType: consentsByType.reduce((acc, item) => {
                    acc[item.type] = item._count;
                    return acc;
                }, {}),
            };
            break;
        default:
            return server_1.NextResponse.json({ error: 'Invalid metric type' }, { status: 400 });
    }
    return server_1.NextResponse.json({
        success: true,
        data: result,
    });
}, {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    skipCsrf: true, // GET requests don't need CSRF protection
});
// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper
//# sourceMappingURL=route.js.map