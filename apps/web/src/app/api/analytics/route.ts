/**
 * Analytics API
 * Real-time metrics and reporting for dashboard
 *
 * GET /api/analytics?metric=patient_count&startDate=...&endDate=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, validateQuery } from '@/lib/api/middleware';
import { AnalyticsQuerySchema } from '@/lib/api/schemas';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const query = context.validatedQuery;
    const metric = query.metric;
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const clinicianId = query.clinicianId;

    let result: any = {};

    // Build where clause for clinician filter
    const clinicianWhere = clinicianId ? { assignedClinicianId: clinicianId } : {};
    const appointmentWhere = clinicianId ? { clinicianId } : {};

    switch (metric) {
      // =====================================================================
      // PATIENT METRICS
      // =====================================================================
      case 'patient_count':
        const totalPatients = await prisma.patient.count({
          where: {
            ...clinicianWhere,
            createdAt: { gte: startDate, lte: endDate },
          },
        });

        const activePatients = await prisma.patient.count({
          where: {
            ...clinicianWhere,
            isActive: true,
            createdAt: { gte: startDate, lte: endDate },
          },
        });

        // Get trend (compare to previous period)
        const previousPeriodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const previousStart = new Date(startDate.getTime() - previousPeriodDays * 24 * 60 * 60 * 1000);

        const previousPatients = await prisma.patient.count({
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

        const todayAppointments = await prisma.appointment.findMany({
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

        const appointmentsByStatus = await prisma.appointment.groupBy({
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
          byStatus: appointmentsByStatus.reduce((acc: any, item) => {
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

        const prescriptions = await prisma.prescription.count({
          where: {
            ...(clinicianId ? { clinicianId } : {}),
            createdAt: { gte: todayStart },
          },
        });

        const byStatus = await prisma.prescription.groupBy({
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
          byStatus: byStatus.reduce((acc: any, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {}),
        };
        break;

      // =====================================================================
      // CLINICAL NOTES METRICS
      // =====================================================================
      case 'clinical_notes_count':
        const notes = await prisma.clinicalNote.count({
          where: {
            ...(clinicianId ? { authorId: clinicianId } : {}),
            createdAt: { gte: startDate, lte: endDate },
          },
        });

        // @ts-ignore - Prisma groupBy type inference issue with spread operator
        const byType = await prisma.clinicalNote.groupBy({
          by: ['type'] as ['type'],
          where: {
            ...(clinicianId && { authorId: clinicianId }),
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
        });

        result = {
          metric: 'clinical_notes_count',
          total: notes,
          byType: byType.reduce((acc: any, item: any) => {
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
        const activeMeds = await prisma.medication.count({
          where: {
            isActive: true,
            ...(clinicianId ? { prescribedBy: clinicianId } : {}),
          },
        });

        // Top 10 prescribed medications
        const topMedications = await prisma.medication.groupBy({
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
        const totalPatientsForConsent = await prisma.patient.count({
          where: { ...clinicianWhere, isActive: true },
        });

        const patientsWithConsent = await prisma.consent.findMany({
          where: { isActive: true },
          distinct: ['patientId'],
          select: { patientId: true },
        });

        const complianceRate = totalPatientsForConsent > 0
          ? ((patientsWithConsent.length / totalPatientsForConsent) * 100).toFixed(1)
          : '0';

        const consentsByType = await prisma.consent.groupBy({
          by: ['type'],
          where: { isActive: true },
          _count: true,
        });

        result = {
          metric: 'consent_compliance',
          totalPatients: totalPatientsForConsent,
          patientsWithConsent: patientsWithConsent.length,
          complianceRate: `${complianceRate}%`,
          byType: consentsByType.reduce((acc: any, item) => {
            acc[item.type] = item._count;
            return acc;
          }, {}),
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid metric type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);

// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper
