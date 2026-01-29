/**
 * MCP Analytics Tools
 *
 * Comprehensive analytics and reporting tools for clinic operations.
 * Uses Prisma aggregations for real-time metrics and insights.
 *
 * Tools:
 * - get_clinic_statistics: Overview statistics for the clinic
 * - get_appointment_analytics: Appointment volume, no-shows, completion rates
 * - get_patient_demographics: Patient demographic breakdown
 * - get_revenue_summary: Revenue and billing summary
 * - get_provider_productivity: Provider productivity metrics
 * - get_patient_flow: Patient flow and wait time analytics
 * - get_quality_metrics: Clinical quality measures
 * - generate_report: Generate a custom report
 * - export_data: Export data for analysis
 * - get_trend_analysis: Get trend analysis for metrics
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const DateRangeSchema = z.object({
    startDate: z.string().optional().describe('Start date (ISO 8601). Defaults to 30 days ago.'),
    endDate: z.string().optional().describe('End date (ISO 8601). Defaults to today.'),
});

const GetClinicStatisticsSchema = DateRangeSchema.extend({
    clinicId: z.string().optional().describe('Filter by clinic ID (for multi-tenant)'),
});

const GetAppointmentAnalyticsSchema = DateRangeSchema.extend({
    clinicianId: z.string().optional().describe('Filter by specific clinician'),
    appointmentType: z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT']).optional().describe('Filter by appointment type'),
    groupBy: z.enum(['day', 'week', 'month']).default('day').describe('Group results by time period'),
});

const GetPatientDemographicsSchema = z.object({
    clinicianId: z.string().optional().describe('Filter by assigned clinician'),
    includeInactive: z.boolean().default(false).describe('Include inactive patients'),
});

const GetRevenueSummarySchema = DateRangeSchema.extend({
    clinicianId: z.string().optional().describe('Filter by clinician'),
    currency: z.string().default('MXN').describe('Currency code'),
    groupBy: z.enum(['day', 'week', 'month']).default('month').describe('Group results by time period'),
});

const GetProviderProductivitySchema = DateRangeSchema.extend({
    clinicianId: z.string().optional().describe('Filter by specific clinician, or get all clinicians'),
    includeMetrics: z.array(z.enum(['appointments', 'notes', 'prescriptions', 'utilization'])).default(['appointments', 'notes', 'prescriptions', 'utilization']).describe('Which metrics to include'),
});

const GetPatientFlowSchema = DateRangeSchema.extend({
    clinicianId: z.string().optional().describe('Filter by clinician'),
    branch: z.string().optional().describe('Filter by branch/location'),
});

const GetQualityMetricsSchema = DateRangeSchema.extend({
    clinicianId: z.string().optional().describe('Filter by clinician'),
    metricType: z.enum(['screening', 'preventive', 'chronic', 'all']).default('all').describe('Type of quality metrics'),
});

const GenerateReportSchema = z.object({
    reportType: z.enum([
        'daily_summary',
        'weekly_summary',
        'monthly_summary',
        'provider_performance',
        'revenue_report',
        'patient_engagement',
        'quality_scorecard',
        'no_show_analysis',
    ]).describe('Type of report to generate'),
    startDate: z.string().describe('Report start date (ISO 8601)'),
    endDate: z.string().describe('Report end date (ISO 8601)'),
    clinicianId: z.string().optional().describe('Filter by clinician'),
    format: z.enum(['json', 'summary']).default('json').describe('Output format'),
});

const ExportDataSchema = z.object({
    dataType: z.enum([
        'appointments',
        'patients',
        'invoices',
        'payments',
        'clinical_notes',
        'prescriptions',
    ]).describe('Type of data to export'),
    startDate: z.string().describe('Export start date (ISO 8601)'),
    endDate: z.string().describe('Export end date (ISO 8601)'),
    clinicianId: z.string().optional().describe('Filter by clinician'),
    format: z.enum(['json', 'csv_metadata']).default('json').describe('Output format (csv_metadata returns field info for CSV generation)'),
    limit: z.number().min(1).max(1000).default(100).describe('Maximum records to export'),
});

const GetTrendAnalysisSchema = z.object({
    metric: z.enum([
        'patient_count',
        'appointment_volume',
        'revenue',
        'no_show_rate',
        'avg_wait_time',
        'prescription_count',
        'note_count',
    ]).describe('Metric to analyze'),
    startDate: z.string().describe('Analysis start date (ISO 8601)'),
    endDate: z.string().describe('Analysis end date (ISO 8601)'),
    granularity: z.enum(['day', 'week', 'month']).default('week').describe('Time granularity for trend'),
    clinicianId: z.string().optional().describe('Filter by clinician'),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDateRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
}

function calculatePercentageChange(current: number, previous: number): { value: number; percentage: string; direction: 'up' | 'down' | 'stable' } {
    if (previous === 0) {
        return { value: current, percentage: current > 0 ? '100' : '0', direction: current > 0 ? 'up' : 'stable' };
    }
    const change = current - previous;
    const percentage = ((change / previous) * 100).toFixed(1);
    return {
        value: change,
        percentage,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
}

function calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
        age--;
    }
    return age;
}

function getAgeBand(age: number): string {
    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    if (age < 70) return '60-69';
    if (age < 80) return '70-79';
    return '80+';
}

// =============================================================================
// HANDLERS
// =============================================================================

async function getClinicStatisticsHandler(
    input: z.infer<typeof GetClinicStatisticsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { start, end } = getDateRange(input.startDate, input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_clinic_statistics',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            agentId: context.agentId,
        });

        // Calculate previous period for comparisons
        const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const previousStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);

        // Get all statistics in parallel
        const [
            totalPatients,
            activePatients,
            newPatients,
            previousNewPatients,
            totalAppointments,
            completedAppointments,
            previousAppointments,
            totalClinicians,
            totalInvoices,
            paidInvoices,
            totalRevenue,
            previousRevenue,
            totalPrescriptions,
            totalNotes,
            totalNoShows,
        ] = await Promise.all([
            prisma.patient.count({ where: { deletedAt: null } }),
            prisma.patient.count({ where: { isActive: true, deletedAt: null } }),
            prisma.patient.count({ where: { createdAt: { gte: start, lte: end }, deletedAt: null } }),
            prisma.patient.count({ where: { createdAt: { gte: previousStart, lt: start }, deletedAt: null } }),
            prisma.appointment.count({ where: { startTime: { gte: start, lte: end } } }),
            prisma.appointment.count({ where: { startTime: { gte: start, lte: end }, status: 'COMPLETED' } }),
            prisma.appointment.count({ where: { startTime: { gte: previousStart, lt: start } } }),
            prisma.user.count({ where: { role: { in: ['CLINICIAN', 'PHYSICIAN', 'NURSE'] } } }),
            prisma.invoice.count({ where: { issueDate: { gte: start, lte: end } } }),
            prisma.invoice.count({ where: { issueDate: { gte: start, lte: end }, status: 'PAID' } }),
            prisma.payment.aggregate({
                where: { processedAt: { gte: start, lte: end }, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            prisma.payment.aggregate({
                where: { processedAt: { gte: previousStart, lt: start }, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            prisma.prescription.count({ where: { createdAt: { gte: start, lte: end } } }),
            prisma.clinicalNote.count({ where: { createdAt: { gte: start, lte: end } } }),
            prisma.appointment.count({ where: { startTime: { gte: start, lte: end }, status: 'NO_SHOW' } }),
        ]);

        const currentRevenue = totalRevenue._sum.amount || 0;
        const prevRevenue = previousRevenue._sum.amount || 0;
        const appointmentCompletionRate = totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : '0';
        const noShowRate = totalAppointments > 0 ? ((totalNoShows / totalAppointments) * 100).toFixed(1) : '0';
        const invoicePaidRate = totalInvoices > 0 ? ((paidInvoices / totalInvoices) * 100).toFixed(1) : '0';

        return {
            success: true,
            data: {
                period: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    days: periodDays,
                },
                patients: {
                    total: totalPatients,
                    active: activePatients,
                    inactive: totalPatients - activePatients,
                    newThisPeriod: newPatients,
                    trend: calculatePercentageChange(newPatients, previousNewPatients),
                },
                appointments: {
                    total: totalAppointments,
                    completed: completedAppointments,
                    noShows: totalNoShows,
                    completionRate: `${appointmentCompletionRate}%`,
                    noShowRate: `${noShowRate}%`,
                    trend: calculatePercentageChange(totalAppointments, previousAppointments),
                    averagePerDay: (totalAppointments / periodDays).toFixed(1),
                },
                revenue: {
                    totalCents: currentRevenue,
                    totalFormatted: `$${(currentRevenue / 100).toLocaleString()}`,
                    trend: calculatePercentageChange(currentRevenue, prevRevenue),
                    invoicesIssued: totalInvoices,
                    invoicesPaid: paidInvoices,
                    paidRate: `${invoicePaidRate}%`,
                },
                clinical: {
                    prescriptions: totalPrescriptions,
                    clinicalNotes: totalNotes,
                    clinicians: totalClinicians,
                    notesPerClinician: totalClinicians > 0 ? (totalNotes / totalClinicians).toFixed(1) : '0',
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_clinic_statistics_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get clinic statistics',
            data: null,
        };
    }
}

async function getAppointmentAnalyticsHandler(
    input: z.infer<typeof GetAppointmentAnalyticsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { start, end } = getDateRange(input.startDate, input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_appointment_analytics',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            clinicianId: input.clinicianId,
            agentId: context.agentId,
        });

        const where: any = {
            startTime: { gte: start, lte: end },
        };
        if (input.clinicianId) where.clinicianId = input.clinicianId;
        if (input.appointmentType) where.type = input.appointmentType;

        // Get appointment statistics
        const [
            totalAppointments,
            byStatus,
            byType,
            noShowHistory,
        ] = await Promise.all([
            prisma.appointment.count({ where }),
            prisma.appointment.groupBy({
                by: ['status'],
                where,
                _count: true,
            }),
            prisma.appointment.groupBy({
                by: ['type'],
                where,
                _count: true,
            }),
            prisma.noShowHistory.findMany({
                where: {
                    appointment: {
                        startTime: { gte: start, lte: end },
                        ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                    },
                },
                select: { patientReason: true, willReschedule: true },
            }),
        ]);

        const statusBreakdown = byStatus.reduce((acc: Record<string, number>, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {});

        const typeBreakdown = byType.reduce((acc: Record<string, number>, item) => {
            acc[item.type] = item._count;
            return acc;
        }, {});

        const completed = statusBreakdown['COMPLETED'] || 0;
        const noShows = statusBreakdown['NO_SHOW'] || 0;
        const cancelled = statusBreakdown['CANCELLED'] || 0;
        const rescheduled = statusBreakdown['RESCHEDULED'] || 0;

        // Calculate no-show reasons if available
        const noShowReasons: Record<string, number> = {};
        noShowHistory.forEach(ns => {
            const reason = ns.patientReason || 'Unknown';
            noShowReasons[reason] = (noShowReasons[reason] || 0) + 1;
        });

        const rescheduledAfterNoShow = noShowHistory.filter(ns => ns.willReschedule).length;

        return {
            success: true,
            data: {
                period: { startDate: start.toISOString(), endDate: end.toISOString() },
                summary: {
                    total: totalAppointments,
                    completed,
                    cancelled,
                    noShows,
                    rescheduled,
                    pending: totalAppointments - completed - cancelled - noShows,
                },
                rates: {
                    completionRate: totalAppointments > 0 ? `${((completed / totalAppointments) * 100).toFixed(1)}%` : '0%',
                    noShowRate: totalAppointments > 0 ? `${((noShows / totalAppointments) * 100).toFixed(1)}%` : '0%',
                    cancellationRate: totalAppointments > 0 ? `${((cancelled / totalAppointments) * 100).toFixed(1)}%` : '0%',
                    rescheduleRate: totalAppointments > 0 ? `${((rescheduled / totalAppointments) * 100).toFixed(1)}%` : '0%',
                },
                byStatus: statusBreakdown,
                byType: typeBreakdown,
                noShowAnalysis: {
                    total: noShows,
                    reasons: noShowReasons,
                    rescheduledAfterNoShow,
                    recoveryRate: noShows > 0 ? `${((rescheduledAfterNoShow / noShows) * 100).toFixed(1)}%` : '0%',
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_appointment_analytics_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get appointment analytics',
            data: null,
        };
    }
}

async function getPatientDemographicsHandler(
    input: z.infer<typeof GetPatientDemographicsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_patient_demographics',
            clinicianId: input.clinicianId,
            agentId: context.agentId,
        });

        const where: any = { deletedAt: null };
        if (!input.includeInactive) where.isActive = true;
        if (input.clinicianId) where.assignedClinicianId = input.clinicianId;

        // Get patient data for demographics
        const patients = await prisma.patient.findMany({
            where,
            select: {
                gender: true,
                dateOfBirth: true,
                state: true,
                country: true,
                isPalliativeCare: true,
                hasSpecialNeeds: true,
            },
        });

        // Calculate demographics
        const genderDistribution: Record<string, number> = {};
        const ageDistribution: Record<string, number> = {};
        const locationDistribution: Record<string, number> = {};
        let palliativeCareCount = 0;
        let specialNeedsCount = 0;

        patients.forEach(patient => {
            // Gender
            const gender = patient.gender || 'Unknown';
            genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;

            // Age
            if (patient.dateOfBirth) {
                const age = calculateAge(patient.dateOfBirth);
                const ageBand = getAgeBand(age);
                ageDistribution[ageBand] = (ageDistribution[ageBand] || 0) + 1;
            }

            // Location
            const location = patient.state || patient.country || 'Unknown';
            locationDistribution[location] = (locationDistribution[location] || 0) + 1;

            // Special populations
            if (patient.isPalliativeCare) palliativeCareCount++;
            if (patient.hasSpecialNeeds) specialNeedsCount++;
        });

        const totalPatients = patients.length;

        return {
            success: true,
            data: {
                totalPatients,
                gender: {
                    distribution: genderDistribution,
                    percentages: Object.fromEntries(
                        Object.entries(genderDistribution).map(([k, v]) => [k, `${((v / totalPatients) * 100).toFixed(1)}%`])
                    ),
                },
                age: {
                    distribution: ageDistribution,
                    percentages: Object.fromEntries(
                        Object.entries(ageDistribution).map(([k, v]) => [k, `${((v / totalPatients) * 100).toFixed(1)}%`])
                    ),
                },
                location: {
                    distribution: locationDistribution,
                    topLocations: Object.entries(locationDistribution)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([location, count]) => ({ location, count, percentage: `${((count / totalPatients) * 100).toFixed(1)}%` })),
                },
                specialPopulations: {
                    palliativeCare: {
                        count: palliativeCareCount,
                        percentage: `${((palliativeCareCount / totalPatients) * 100).toFixed(1)}%`,
                    },
                    specialNeeds: {
                        count: specialNeedsCount,
                        percentage: `${((specialNeedsCount / totalPatients) * 100).toFixed(1)}%`,
                    },
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_patient_demographics_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get patient demographics',
            data: null,
        };
    }
}

async function getRevenueSummaryHandler(
    input: z.infer<typeof GetRevenueSummarySchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { start, end } = getDateRange(input.startDate, input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_revenue_summary',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            agentId: context.agentId,
        });

        const invoiceWhere: any = {
            issueDate: { gte: start, lte: end },
            currency: input.currency,
        };

        const paymentWhere: any = {
            createdAt: { gte: start, lte: end },
            currency: input.currency,
        };

        const [
            invoiceStats,
            invoicesByStatus,
            paymentStats,
            paymentsByMethod,
            paymentsByStatus,
            outstandingInvoices,
        ] = await Promise.all([
            prisma.invoice.aggregate({
                where: invoiceWhere,
                _sum: { totalAmount: true, taxAmount: true, discountAmount: true },
                _count: true,
                _avg: { totalAmount: true },
            }),
            prisma.invoice.groupBy({
                by: ['status'],
                where: invoiceWhere,
                _count: true,
                _sum: { totalAmount: true },
            }),
            prisma.payment.aggregate({
                where: { ...paymentWhere, status: 'COMPLETED' },
                _sum: { amount: true },
                _count: true,
                _avg: { amount: true },
            }),
            prisma.payment.groupBy({
                by: ['paymentMethod'],
                where: { ...paymentWhere, status: 'COMPLETED' },
                _count: true,
                _sum: { amount: true },
            }),
            prisma.payment.groupBy({
                by: ['status'],
                where: paymentWhere,
                _count: true,
                _sum: { amount: true },
            }),
            prisma.invoice.aggregate({
                where: {
                    status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
                    dueDate: { lte: end },
                },
                _sum: { totalAmount: true },
                _count: true,
            }),
        ]);

        const totalInvoiced = invoiceStats._sum.totalAmount || 0;
        const totalCollected = paymentStats._sum.amount || 0;
        const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0';

        return {
            success: true,
            data: {
                period: { startDate: start.toISOString(), endDate: end.toISOString() },
                currency: input.currency,
                invoices: {
                    count: invoiceStats._count,
                    totalAmountCents: totalInvoiced,
                    totalFormatted: `$${(totalInvoiced / 100).toLocaleString()}`,
                    taxAmountCents: invoiceStats._sum.taxAmount || 0,
                    discountAmountCents: invoiceStats._sum.discountAmount || 0,
                    averageAmountCents: Math.round(invoiceStats._avg.totalAmount || 0),
                    byStatus: invoicesByStatus.map(s => ({
                        status: s.status,
                        count: s._count,
                        totalCents: s._sum.totalAmount || 0,
                    })),
                },
                payments: {
                    count: paymentStats._count,
                    totalAmountCents: totalCollected,
                    totalFormatted: `$${(totalCollected / 100).toLocaleString()}`,
                    averageAmountCents: Math.round(paymentStats._avg.amount || 0),
                    byMethod: paymentsByMethod.map(m => ({
                        method: m.paymentMethod,
                        count: m._count,
                        totalCents: m._sum.amount || 0,
                    })),
                    byStatus: paymentsByStatus.map(s => ({
                        status: s.status,
                        count: s._count,
                        totalCents: s._sum.amount || 0,
                    })),
                },
                collections: {
                    collectionRate: `${collectionRate}%`,
                    outstandingInvoices: outstandingInvoices._count,
                    outstandingAmountCents: outstandingInvoices._sum.totalAmount || 0,
                    outstandingFormatted: `$${((outstandingInvoices._sum.totalAmount || 0) / 100).toLocaleString()}`,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_revenue_summary_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get revenue summary',
            data: null,
        };
    }
}

async function getProviderProductivityHandler(
    input: z.infer<typeof GetProviderProductivitySchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { start, end } = getDateRange(input.startDate, input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_provider_productivity',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            clinicianId: input.clinicianId,
            agentId: context.agentId,
        });

        const clinicianWhere: any = {
            role: { in: ['CLINICIAN', 'PHYSICIAN', 'NURSE'] },
        };
        if (input.clinicianId) clinicianWhere.id = input.clinicianId;

        const clinicians = await prisma.user.findMany({
            where: clinicianWhere,
            select: { id: true, firstName: true, lastName: true, specialty: true },
        });

        const providerMetrics = await Promise.all(
            clinicians.map(async (clinician) => {
                const metrics: any = {
                    clinicianId: clinician.id,
                    name: `${clinician.firstName} ${clinician.lastName}`,
                    specialty: clinician.specialty,
                };

                if (input.includeMetrics.includes('appointments')) {
                    const [totalAppointments, completedAppointments, noShows] = await Promise.all([
                        prisma.appointment.count({
                            where: { clinicianId: clinician.id, startTime: { gte: start, lte: end } },
                        }),
                        prisma.appointment.count({
                            where: { clinicianId: clinician.id, startTime: { gte: start, lte: end }, status: 'COMPLETED' },
                        }),
                        prisma.appointment.count({
                            where: { clinicianId: clinician.id, startTime: { gte: start, lte: end }, status: 'NO_SHOW' },
                        }),
                    ]);
                    metrics.appointments = {
                        total: totalAppointments,
                        completed: completedAppointments,
                        noShows,
                        completionRate: totalAppointments > 0 ? `${((completedAppointments / totalAppointments) * 100).toFixed(1)}%` : '0%',
                    };
                }

                if (input.includeMetrics.includes('notes')) {
                    const noteCount = await prisma.clinicalNote.count({
                        where: { authorId: clinician.id, createdAt: { gte: start, lte: end } },
                    });
                    metrics.notes = { total: noteCount };
                }

                if (input.includeMetrics.includes('prescriptions')) {
                    const prescriptionCount = await prisma.prescription.count({
                        where: { clinicianId: clinician.id, createdAt: { gte: start, lte: end } },
                    });
                    metrics.prescriptions = { total: prescriptionCount };
                }

                if (input.includeMetrics.includes('utilization')) {
                    // Calculate utilization based on working hours (assuming 8 hours/day, 5 days/week)
                    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const workingDays = Math.floor(periodDays * 5 / 7);
                    const totalSlots = workingDays * 16; // 16 slots per day (30 min each over 8 hours)
                    const bookedSlots = metrics.appointments?.total || 0;
                    metrics.utilization = {
                        workingDays,
                        totalSlots,
                        bookedSlots,
                        utilizationRate: totalSlots > 0 ? `${((bookedSlots / totalSlots) * 100).toFixed(1)}%` : '0%',
                    };
                }

                return metrics;
            })
        );

        return {
            success: true,
            data: {
                period: { startDate: start.toISOString(), endDate: end.toISOString() },
                providerCount: providerMetrics.length,
                providers: providerMetrics,
                summary: {
                    totalAppointments: providerMetrics.reduce((sum, p) => sum + (p.appointments?.total || 0), 0),
                    totalNotes: providerMetrics.reduce((sum, p) => sum + (p.notes?.total || 0), 0),
                    totalPrescriptions: providerMetrics.reduce((sum, p) => sum + (p.prescriptions?.total || 0), 0),
                    averageUtilization: providerMetrics.length > 0
                        ? `${(providerMetrics.reduce((sum, p) => sum + parseFloat(p.utilization?.utilizationRate || '0'), 0) / providerMetrics.length).toFixed(1)}%`
                        : '0%',
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_provider_productivity_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get provider productivity',
            data: null,
        };
    }
}

async function getPatientFlowHandler(
    input: z.infer<typeof GetPatientFlowSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { start, end } = getDateRange(input.startDate, input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_patient_flow',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            agentId: context.agentId,
        });

        const where: any = {
            startTime: { gte: start, lte: end },
        };
        if (input.clinicianId) where.clinicianId = input.clinicianId;
        if (input.branch) where.branch = input.branch;

        // Get appointments with check-in data
        const appointments = await prisma.appointment.findMany({
            where,
            select: {
                id: true,
                startTime: true,
                waitingRoomCheckedInAt: true,
                status: true,
                branch: true,
            },
        });

        // Calculate wait times
        const waitTimes: number[] = [];
        let checkedInCount = 0;

        appointments.forEach(apt => {
            if (apt.waitingRoomCheckedInAt && apt.startTime) {
                const waitTime = (apt.startTime.getTime() - apt.waitingRoomCheckedInAt.getTime()) / 60000; // in minutes
                if (waitTime > 0 && waitTime < 180) { // Reasonable wait time < 3 hours
                    waitTimes.push(waitTime);
                }
                checkedInCount++;
            }
        });

        const averageWaitTime = waitTimes.length > 0
            ? (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1)
            : '0';
        const medianWaitTime = waitTimes.length > 0
            ? waitTimes.sort((a, b) => a - b)[Math.floor(waitTimes.length / 2)].toFixed(1)
            : '0';

        // Group by hour of day
        const byHourOfDay: Record<number, number> = {};
        appointments.forEach(apt => {
            const hour = apt.startTime.getHours();
            byHourOfDay[hour] = (byHourOfDay[hour] || 0) + 1;
        });

        // Group by day of week
        const byDayOfWeek: Record<string, number> = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        appointments.forEach(apt => {
            const day = dayNames[apt.startTime.getDay()];
            byDayOfWeek[day] = (byDayOfWeek[day] || 0) + 1;
        });

        // Group by branch
        const byBranch: Record<string, number> = {};
        appointments.forEach(apt => {
            const branch = apt.branch || 'Main';
            byBranch[branch] = (byBranch[branch] || 0) + 1;
        });

        const peakHours = Object.entries(byHourOfDay)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));

        const busiestDay = Object.entries(byDayOfWeek)
            .sort(([, a], [, b]) => b - a)[0];

        return {
            success: true,
            data: {
                period: { startDate: start.toISOString(), endDate: end.toISOString() },
                totalAppointments: appointments.length,
                checkIns: {
                    total: checkedInCount,
                    rate: appointments.length > 0 ? `${((checkedInCount / appointments.length) * 100).toFixed(1)}%` : '0%',
                },
                waitTime: {
                    averageMinutes: averageWaitTime,
                    medianMinutes: medianWaitTime,
                    sampleSize: waitTimes.length,
                },
                patterns: {
                    byHourOfDay,
                    byDayOfWeek,
                    peakHours,
                    busiestDay: busiestDay ? { day: busiestDay[0], count: busiestDay[1] } : null,
                },
                byBranch,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_patient_flow_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get patient flow',
            data: null,
        };
    }
}

async function getQualityMetricsHandler(
    input: z.infer<typeof GetQualityMetricsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { start, end } = getDateRange(input.startDate, input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_quality_metrics',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            metricType: input.metricType,
            agentId: context.agentId,
        });

        const patientWhere: any = { isActive: true, deletedAt: null };
        if (input.clinicianId) patientWhere.assignedClinicianId = input.clinicianId;

        const result: any = {
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
        };

        if (input.metricType === 'all' || input.metricType === 'screening') {
            // Get screening compliance rates
            const patients = await prisma.patient.findMany({
                where: patientWhere,
                select: {
                    id: true,
                    dateOfBirth: true,
                    gender: true,
                    lastBloodPressureCheck: true,
                    lastCholesterolTest: true,
                    lastMammogram: true,
                    lastPapSmear: true,
                    lastColonoscopy: true,
                },
            });

            const oneYearAgo = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
            const threeYearsAgo = new Date(end.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);

            let bpCompliant = 0;
            let cholesterolCompliant = 0;
            let mammogramEligible = 0;
            let mammogramCompliant = 0;
            let papSmearEligible = 0;
            let papSmearCompliant = 0;
            let colonoscopyEligible = 0;
            let colonoscopyCompliant = 0;

            patients.forEach(p => {
                // BP check within last year
                if (p.lastBloodPressureCheck && p.lastBloodPressureCheck >= oneYearAgo) bpCompliant++;

                // Cholesterol check within last year
                if (p.lastCholesterolTest && p.lastCholesterolTest >= oneYearAgo) cholesterolCompliant++;

                if (p.dateOfBirth) {
                    const age = calculateAge(p.dateOfBirth);

                    // Mammogram: Women 40+ every 1-2 years
                    if (p.gender === 'female' || p.gender === 'Female' || p.gender === 'F') {
                        if (age >= 40) {
                            mammogramEligible++;
                            if (p.lastMammogram && p.lastMammogram >= new Date(end.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)) {
                                mammogramCompliant++;
                            }
                        }
                        // Pap smear: Women 21-65 every 3 years
                        if (age >= 21 && age <= 65) {
                            papSmearEligible++;
                            if (p.lastPapSmear && p.lastPapSmear >= threeYearsAgo) {
                                papSmearCompliant++;
                            }
                        }
                    }

                    // Colonoscopy: Adults 45+ every 10 years
                    if (age >= 45) {
                        colonoscopyEligible++;
                        if (p.lastColonoscopy && p.lastColonoscopy >= new Date(end.getTime() - 10 * 365 * 24 * 60 * 60 * 1000)) {
                            colonoscopyCompliant++;
                        }
                    }
                }
            });

            result.screening = {
                bloodPressure: {
                    eligible: patients.length,
                    compliant: bpCompliant,
                    rate: patients.length > 0 ? `${((bpCompliant / patients.length) * 100).toFixed(1)}%` : '0%',
                },
                cholesterol: {
                    eligible: patients.length,
                    compliant: cholesterolCompliant,
                    rate: patients.length > 0 ? `${((cholesterolCompliant / patients.length) * 100).toFixed(1)}%` : '0%',
                },
                mammogram: {
                    eligible: mammogramEligible,
                    compliant: mammogramCompliant,
                    rate: mammogramEligible > 0 ? `${((mammogramCompliant / mammogramEligible) * 100).toFixed(1)}%` : 'N/A',
                },
                papSmear: {
                    eligible: papSmearEligible,
                    compliant: papSmearCompliant,
                    rate: papSmearEligible > 0 ? `${((papSmearCompliant / papSmearEligible) * 100).toFixed(1)}%` : 'N/A',
                },
                colonoscopy: {
                    eligible: colonoscopyEligible,
                    compliant: colonoscopyCompliant,
                    rate: colonoscopyEligible > 0 ? `${((colonoscopyCompliant / colonoscopyEligible) * 100).toFixed(1)}%` : 'N/A',
                },
            };
        }

        if (input.metricType === 'all' || input.metricType === 'preventive') {
            // Get preventive care metrics
            const [
                preventionPlans,
                completedScreenings,
            ] = await Promise.all([
                prisma.preventionPlan.count({
                    where: { createdAt: { gte: start, lte: end } },
                }),
                prisma.screeningOutcome.count({
                    where: { completedDate: { gte: start, lte: end } },
                }),
            ]);

            result.preventive = {
                preventionPlansCreated: preventionPlans,
                screeningsCompleted: completedScreenings,
            };
        }

        if (input.metricType === 'all' || input.metricType === 'chronic') {
            // Get chronic disease management metrics
            const [diabeticPatients, controlledDiabetics] = await Promise.all([
                prisma.patient.count({
                    where: { ...patientWhere, prediabetesDetected: true },
                }),
                prisma.patient.count({
                    where: {
                        ...patientWhere,
                        prediabetesDetected: true,
                        lastHbA1c: { gte: new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000) },
                    },
                }),
            ]);

            result.chronic = {
                diabetesManagement: {
                    totalPatients: diabeticPatients,
                    recentHbA1c: controlledDiabetics,
                    monitoringRate: diabeticPatients > 0 ? `${((controlledDiabetics / diabeticPatients) * 100).toFixed(1)}%` : 'N/A',
                },
            };
        }

        return {
            success: true,
            data: result,
        };
    } catch (error) {
        logger.error({ event: 'get_quality_metrics_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get quality metrics',
            data: null,
        };
    }
}

async function generateReportHandler(
    input: z.infer<typeof GenerateReportSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'generate_report',
            reportType: input.reportType,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            agentId: context.agentId,
        });

        let reportData: any = {
            reportType: input.reportType,
            generatedAt: new Date().toISOString(),
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
        };

        switch (input.reportType) {
            case 'daily_summary':
            case 'weekly_summary':
            case 'monthly_summary': {
                const [appointments, patients, revenue, notes] = await Promise.all([
                    prisma.appointment.count({ where: { startTime: { gte: start, lte: end } } }),
                    prisma.patient.count({ where: { createdAt: { gte: start, lte: end } } }),
                    prisma.payment.aggregate({
                        where: { processedAt: { gte: start, lte: end }, status: 'COMPLETED' },
                        _sum: { amount: true },
                    }),
                    prisma.clinicalNote.count({ where: { createdAt: { gte: start, lte: end } } }),
                ]);

                reportData.summary = {
                    appointments,
                    newPatients: patients,
                    revenueCents: revenue._sum.amount || 0,
                    clinicalNotes: notes,
                };
                break;
            }

            case 'provider_performance': {
                const clinicians = await prisma.user.findMany({
                    where: {
                        role: { in: ['CLINICIAN', 'PHYSICIAN'] },
                        ...(input.clinicianId ? { id: input.clinicianId } : {}),
                    },
                    select: { id: true, firstName: true, lastName: true },
                });

                reportData.providers = await Promise.all(clinicians.map(async c => ({
                    name: `${c.firstName} ${c.lastName}`,
                    appointments: await prisma.appointment.count({
                        where: { clinicianId: c.id, startTime: { gte: start, lte: end } },
                    }),
                    notes: await prisma.clinicalNote.count({
                        where: { authorId: c.id, createdAt: { gte: start, lte: end } },
                    }),
                })));
                break;
            }

            case 'revenue_report': {
                const [invoices, payments] = await Promise.all([
                    prisma.invoice.aggregate({
                        where: { issueDate: { gte: start, lte: end } },
                        _sum: { totalAmount: true },
                        _count: true,
                    }),
                    prisma.payment.aggregate({
                        where: { processedAt: { gte: start, lte: end }, status: 'COMPLETED' },
                        _sum: { amount: true },
                        _count: true,
                    }),
                ]);

                reportData.revenue = {
                    invoicedCents: invoices._sum.totalAmount || 0,
                    invoiceCount: invoices._count,
                    collectedCents: payments._sum.amount || 0,
                    paymentCount: payments._count,
                };
                break;
            }

            case 'no_show_analysis': {
                const [total, noShows, noShowHistory] = await Promise.all([
                    prisma.appointment.count({ where: { startTime: { gte: start, lte: end } } }),
                    prisma.appointment.count({
                        where: { startTime: { gte: start, lte: end }, status: 'NO_SHOW' },
                    }),
                    prisma.noShowHistory.findMany({
                        where: {
                            appointment: { startTime: { gte: start, lte: end } },
                        },
                        select: { patientReason: true, willReschedule: true },
                    }),
                ]);

                const reasons: Record<string, number> = {};
                noShowHistory.forEach(ns => {
                    const r = ns.patientReason || 'Unknown';
                    reasons[r] = (reasons[r] || 0) + 1;
                });

                reportData.noShows = {
                    total: noShows,
                    rate: total > 0 ? `${((noShows / total) * 100).toFixed(1)}%` : '0%',
                    reasons,
                    rescheduled: noShowHistory.filter(ns => ns.willReschedule).length,
                };
                break;
            }

            default:
                reportData.summary = { note: 'Report type not fully implemented yet' };
        }

        if (input.format === 'summary') {
            // Create a text summary
            reportData.textSummary = `Report: ${input.reportType}\nPeriod: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}\nGenerated: ${new Date().toISOString()}`;
        }

        return {
            success: true,
            data: reportData,
        };
    } catch (error) {
        logger.error({ event: 'generate_report_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate report',
            data: null,
        };
    }
}

async function exportDataHandler(
    input: z.infer<typeof ExportDataSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'export_data',
            dataType: input.dataType,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            limit: input.limit,
            agentId: context.agentId,
        });

        let data: any[] = [];
        let fields: string[] = [];

        switch (input.dataType) {
            case 'appointments':
                data = await prisma.appointment.findMany({
                    where: {
                        startTime: { gte: start, lte: end },
                        ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                    },
                    select: {
                        id: true,
                        patientId: true,
                        clinicianId: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        type: true,
                        status: true,
                        branch: true,
                        createdAt: true,
                    },
                    take: input.limit,
                    orderBy: { startTime: 'desc' },
                });
                fields = ['id', 'patientId', 'clinicianId', 'title', 'startTime', 'endTime', 'type', 'status', 'branch', 'createdAt'];
                break;

            case 'patients':
                data = await prisma.patient.findMany({
                    where: {
                        createdAt: { gte: start, lte: end },
                        deletedAt: null,
                        ...(input.clinicianId ? { assignedClinicianId: input.clinicianId } : {}),
                    },
                    select: {
                        id: true,
                        tokenId: true,
                        gender: true,
                        dateOfBirth: true,
                        city: true,
                        state: true,
                        isActive: true,
                        createdAt: true,
                    },
                    take: input.limit,
                    orderBy: { createdAt: 'desc' },
                });
                fields = ['id', 'tokenId', 'gender', 'dateOfBirth', 'city', 'state', 'isActive', 'createdAt'];
                break;

            case 'invoices':
                data = await prisma.invoice.findMany({
                    where: {
                        issueDate: { gte: start, lte: end },
                    },
                    select: {
                        id: true,
                        invoiceNumber: true,
                        patientId: true,
                        status: true,
                        totalAmount: true,
                        currency: true,
                        issueDate: true,
                        dueDate: true,
                        paidDate: true,
                    },
                    take: input.limit,
                    orderBy: { issueDate: 'desc' },
                });
                fields = ['id', 'invoiceNumber', 'patientId', 'status', 'totalAmount', 'currency', 'issueDate', 'dueDate', 'paidDate'];
                break;

            case 'payments':
                data = await prisma.payment.findMany({
                    where: {
                        createdAt: { gte: start, lte: end },
                    },
                    select: {
                        id: true,
                        paymentNumber: true,
                        patientId: true,
                        invoiceId: true,
                        amount: true,
                        currency: true,
                        paymentMethod: true,
                        status: true,
                        processedAt: true,
                    },
                    take: input.limit,
                    orderBy: { createdAt: 'desc' },
                });
                fields = ['id', 'paymentNumber', 'patientId', 'invoiceId', 'amount', 'currency', 'paymentMethod', 'status', 'processedAt'];
                break;

            case 'clinical_notes':
                data = await prisma.clinicalNote.findMany({
                    where: {
                        createdAt: { gte: start, lte: end },
                        ...(input.clinicianId ? { authorId: input.clinicianId } : {}),
                    },
                    select: {
                        id: true,
                        patientId: true,
                        authorId: true,
                        type: true,
                        signedAt: true,
                        createdAt: true,
                    },
                    take: input.limit,
                    orderBy: { createdAt: 'desc' },
                });
                fields = ['id', 'patientId', 'authorId', 'type', 'signedAt', 'createdAt'];
                break;

            case 'prescriptions':
                data = await prisma.prescription.findMany({
                    where: {
                        createdAt: { gte: start, lte: end },
                        ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                    },
                    select: {
                        id: true,
                        patientId: true,
                        clinicianId: true,
                        status: true,
                        createdAt: true,
                    },
                    take: input.limit,
                    orderBy: { createdAt: 'desc' },
                });
                fields = ['id', 'patientId', 'clinicianId', 'status', 'createdAt'];
                break;
        }

        if (input.format === 'csv_metadata') {
            return {
                success: true,
                data: {
                    dataType: input.dataType,
                    recordCount: data.length,
                    fields,
                    sampleRecord: data[0] || null,
                    note: 'Use the JSON format for full data export. CSV generation should be done client-side.',
                },
            };
        }

        return {
            success: true,
            data: {
                dataType: input.dataType,
                period: { startDate: start.toISOString(), endDate: end.toISOString() },
                recordCount: data.length,
                fields,
                records: data,
            },
        };
    } catch (error) {
        logger.error({ event: 'export_data_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to export data',
            data: null,
        };
    }
}

async function getTrendAnalysisHandler(
    input: z.infer<typeof GetTrendAnalysisSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_trend_analysis',
            metric: input.metric,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            granularity: input.granularity,
            agentId: context.agentId,
        });

        // Generate date buckets based on granularity
        const buckets: { start: Date; end: Date; label: string }[] = [];
        const current = new Date(start);

        while (current < end) {
            const bucketStart = new Date(current);
            let bucketEnd: Date;
            let label: string;

            switch (input.granularity) {
                case 'day':
                    bucketEnd = new Date(current);
                    bucketEnd.setDate(bucketEnd.getDate() + 1);
                    label = current.toISOString().split('T')[0];
                    current.setDate(current.getDate() + 1);
                    break;
                case 'week':
                    bucketEnd = new Date(current);
                    bucketEnd.setDate(bucketEnd.getDate() + 7);
                    label = `Week of ${current.toISOString().split('T')[0]}`;
                    current.setDate(current.getDate() + 7);
                    break;
                case 'month':
                    bucketEnd = new Date(current);
                    bucketEnd.setMonth(bucketEnd.getMonth() + 1);
                    label = `${current.toLocaleString('default', { month: 'short' })} ${current.getFullYear()}`;
                    current.setMonth(current.getMonth() + 1);
                    break;
            }

            if (bucketEnd! > end) bucketEnd = end;
            buckets.push({ start: bucketStart, end: bucketEnd!, label: label! });
        }

        // Get data for each bucket
        const trendData = await Promise.all(buckets.map(async (bucket) => {
            let value: number;

            switch (input.metric) {
                case 'patient_count':
                    value = await prisma.patient.count({
                        where: {
                            createdAt: { gte: bucket.start, lt: bucket.end },
                            deletedAt: null,
                            ...(input.clinicianId ? { assignedClinicianId: input.clinicianId } : {}),
                        },
                    });
                    break;

                case 'appointment_volume':
                    value = await prisma.appointment.count({
                        where: {
                            startTime: { gte: bucket.start, lt: bucket.end },
                            ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                        },
                    });
                    break;

                case 'revenue':
                    const revenue = await prisma.payment.aggregate({
                        where: {
                            processedAt: { gte: bucket.start, lt: bucket.end },
                            status: 'COMPLETED',
                        },
                        _sum: { amount: true },
                    });
                    value = revenue._sum.amount || 0;
                    break;

                case 'no_show_rate':
                    const [total, noShows] = await Promise.all([
                        prisma.appointment.count({
                            where: {
                                startTime: { gte: bucket.start, lt: bucket.end },
                                ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                            },
                        }),
                        prisma.appointment.count({
                            where: {
                                startTime: { gte: bucket.start, lt: bucket.end },
                                status: 'NO_SHOW',
                                ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                            },
                        }),
                    ]);
                    value = total > 0 ? (noShows / total) * 100 : 0;
                    break;

                case 'prescription_count':
                    value = await prisma.prescription.count({
                        where: {
                            createdAt: { gte: bucket.start, lt: bucket.end },
                            ...(input.clinicianId ? { clinicianId: input.clinicianId } : {}),
                        },
                    });
                    break;

                case 'note_count':
                    value = await prisma.clinicalNote.count({
                        where: {
                            createdAt: { gte: bucket.start, lt: bucket.end },
                            ...(input.clinicianId ? { authorId: input.clinicianId } : {}),
                        },
                    });
                    break;

                default:
                    value = 0;
            }

            return { period: bucket.label, value };
        }));

        // Calculate statistics
        const values = trendData.map(t => t.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Calculate trend direction
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
        const trendDirection = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';

        return {
            success: true,
            data: {
                metric: input.metric,
                period: { startDate: start.toISOString(), endDate: end.toISOString() },
                granularity: input.granularity,
                dataPoints: trendData,
                statistics: {
                    total: sum,
                    average: avg.toFixed(2),
                    min,
                    max,
                    dataPointCount: trendData.length,
                },
                trend: {
                    direction: trendDirection,
                    firstHalfAverage: firstAvg.toFixed(2),
                    secondHalfAverage: secondAvg.toFixed(2),
                    changePercentage: firstAvg > 0 ? `${(((secondAvg - firstAvg) / firstAvg) * 100).toFixed(1)}%` : 'N/A',
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_trend_analysis_error', error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get trend analysis',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const analyticsTools: MCPTool[] = [
    {
        name: 'get_clinic_statistics',
        description: 'Get comprehensive clinic overview statistics including patient counts, appointment metrics, revenue summary, and clinical activity for a date range.',
        category: 'analytics' as any,
        inputSchema: GetClinicStatisticsSchema,
        requiredPermissions: ['analytics:read'],
        handler: getClinicStatisticsHandler,
        examples: [
            {
                description: 'Get clinic statistics for the last 30 days',
                input: {},
            },
            {
                description: 'Get clinic statistics for a specific date range',
                input: { startDate: '2025-01-01', endDate: '2025-01-31' },
            },
        ],
    },
    {
        name: 'get_appointment_analytics',
        description: 'Get detailed appointment analytics including volume, completion rates, no-show analysis, and type breakdown.',
        category: 'analytics' as any,
        inputSchema: GetAppointmentAnalyticsSchema,
        requiredPermissions: ['analytics:read'],
        handler: getAppointmentAnalyticsHandler,
        examples: [
            {
                description: 'Get appointment analytics for a clinician',
                input: { clinicianId: 'clinician-123', startDate: '2025-01-01', endDate: '2025-01-31' },
            },
        ],
    },
    {
        name: 'get_patient_demographics',
        description: 'Get patient demographic breakdown including age, gender, location distribution, and special populations.',
        category: 'analytics' as any,
        inputSchema: GetPatientDemographicsSchema,
        requiredPermissions: ['analytics:read', 'patient:read'],
        handler: getPatientDemographicsHandler,
    },
    {
        name: 'get_revenue_summary',
        description: 'Get revenue and billing summary including invoices, payments, collection rates, and outstanding amounts.',
        category: 'analytics' as any,
        inputSchema: GetRevenueSummarySchema,
        requiredPermissions: ['analytics:read', 'billing:read'],
        handler: getRevenueSummaryHandler,
    },
    {
        name: 'get_provider_productivity',
        description: 'Get provider productivity metrics including appointments, notes, prescriptions, and utilization rates.',
        category: 'analytics' as any,
        inputSchema: GetProviderProductivitySchema,
        requiredPermissions: ['analytics:read'],
        handler: getProviderProductivityHandler,
    },
    {
        name: 'get_patient_flow',
        description: 'Get patient flow analytics including wait times, peak hours, busiest days, and check-in patterns.',
        category: 'analytics' as any,
        inputSchema: GetPatientFlowSchema,
        requiredPermissions: ['analytics:read'],
        handler: getPatientFlowHandler,
    },
    {
        name: 'get_quality_metrics',
        description: 'Get clinical quality metrics including screening compliance, preventive care rates, and chronic disease management.',
        category: 'analytics' as any,
        inputSchema: GetQualityMetricsSchema,
        requiredPermissions: ['analytics:read', 'patient:read'],
        handler: getQualityMetricsHandler,
    },
    {
        name: 'generate_report',
        description: 'Generate a custom report for a specified time period (daily, weekly, monthly summaries, provider performance, revenue, etc.).',
        category: 'analytics' as any,
        inputSchema: GenerateReportSchema,
        requiredPermissions: ['analytics:read', 'analytics:export'],
        handler: generateReportHandler,
    },
    {
        name: 'export_data',
        description: 'Export clinic data (appointments, patients, invoices, payments, notes, prescriptions) for analysis.',
        category: 'analytics' as any,
        inputSchema: ExportDataSchema,
        requiredPermissions: ['analytics:read', 'analytics:export'],
        handler: exportDataHandler,
    },
    {
        name: 'get_trend_analysis',
        description: 'Get trend analysis for a specific metric over time with statistics and direction indicators.',
        category: 'analytics' as any,
        inputSchema: GetTrendAnalysisSchema,
        requiredPermissions: ['analytics:read'],
        handler: getTrendAnalysisHandler,
        examples: [
            {
                description: 'Analyze appointment volume trends by week',
                input: {
                    metric: 'appointment_volume',
                    startDate: '2025-01-01',
                    endDate: '2025-03-31',
                    granularity: 'week',
                },
            },
            {
                description: 'Analyze revenue trends by month',
                input: {
                    metric: 'revenue',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31',
                    granularity: 'month',
                },
            },
        ],
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const ANALYTICS_TOOL_COUNT = analyticsTools.length;
