/**
 * Dashboard Analytics API
 *
 * GET /api/analytics/dashboard - Get comprehensive analytics for dashboard view
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get overview statistics
    const [
      totalPatients,
      activePatients,
      totalConsultations,
      totalPrescriptions,
      totalForms,
      completedForms,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { isActive: true } }),
      prisma.clinicalNote.count({ where: { createdAt: { gte: startDate } } }),
      prisma.prescription.count({ where: { createdAt: { gte: startDate } } }),
      prisma.formInstance.count({ where: { sentAt: { gte: startDate } } }),
      prisma.formInstance.count({
        where: {
          sentAt: { gte: startDate },
          status: { in: ['SIGNED', 'COMPLETED'] },
        },
      }),
    ]);

    // Calculate previous period for trends
    let prevStartDate = new Date(startDate);
    const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);

    const [prevPatients, prevConsultations, prevForms] = await Promise.all([
      prisma.patient.count({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
        },
      }),
      prisma.clinicalNote.count({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
        },
      }),
      prisma.formInstance.count({
        where: {
          sentAt: { gte: prevStartDate, lt: startDate },
        },
      }),
    ]);

    const currentPatients = await prisma.patient.count({
      where: { createdAt: { gte: startDate } },
    });

    const patientsGrowth =
      prevPatients > 0
        ? Math.round(((currentPatients - prevPatients) / prevPatients) * 100)
        : currentPatients > 0
        ? 100
        : 0;

    const consultationsGrowth =
      prevConsultations > 0
        ? Math.round(((totalConsultations - prevConsultations) / prevConsultations) * 100)
        : totalConsultations > 0
        ? 100
        : 0;

    const formsGrowth =
      prevForms > 0
        ? Math.round(((totalForms - prevForms) / prevForms) * 100)
        : totalForms > 0
        ? 100
        : 0;

    // Get recent activity (simplified)
    const recentDays = 14;
    const recentActivity = [];

    for (let i = recentDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [consultations, newPatients, formsSent] = await Promise.all([
        prisma.clinicalNote.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.patient.count({
          where: {
            createdAt: { gte: date, lt: nextDate },
          },
        }),
        prisma.formInstance.count({
          where: {
            sentAt: { gte: date, lt: nextDate },
          },
        }),
      ]);

      recentActivity.push({
        date: date.toISOString(),
        consultations,
        newPatients,
        formsSent,
      });
    }

    // Get top diagnoses (if any)
    const topDiagnoses: { code: string; name: string; count: number }[] = [];

    try {
      // Try to get diagnoses from clinical notes
      const notes = await prisma.clinicalNote.findMany({
        where: { createdAt: { gte: startDate } },
        select: { diagnosis: true },
      });

      const diagnosisMap: Record<string, number> = {};

      notes.forEach((note) => {
        if (note.diagnosis && Array.isArray(note.diagnosis)) {
          note.diagnosis.forEach((diag: string) => {
            if (diag && diag.trim()) {
              if (diagnosisMap[diag]) {
                diagnosisMap[diag]++;
              } else {
                diagnosisMap[diag] = 1;
              }
            }
          });
        }
      });

      Object.entries(diagnosisMap).forEach(([name, count]) => {
        topDiagnoses.push({
          code: name.substring(0, 10).toUpperCase(),
          name,
          count,
        });
      });

      topDiagnoses.sort((a, b) => b.count - a.count);
    } catch (err) {
      console.warn('Could not fetch diagnoses:', err);
    }

    const pendingForms = totalForms - completedForms;
    const formCompletionRate = {
      sent: totalForms,
      completed: completedForms,
      pending: pendingForms,
      rate: totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0,
    };

    return NextResponse.json(
      {
        overview: {
          totalPatients,
          activePatients,
          totalConsultations,
          totalPrescriptions,
          totalForms,
          completedForms,
        },
        trends: {
          patientsGrowth,
          consultationsGrowth,
          formsGrowth,
        },
        recentActivity,
        topDiagnoses: topDiagnoses.slice(0, 10),
        formCompletionRate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json(
      {
        overview: {
          totalPatients: 0,
          activePatients: 0,
          totalConsultations: 0,
          totalPrescriptions: 0,
          totalForms: 0,
          completedForms: 0,
        },
        trends: {
          patientsGrowth: 0,
          consultationsGrowth: 0,
          formsGrowth: 0,
        },
        recentActivity: [],
        topDiagnoses: [],
        formCompletionRate: {
          sent: 0,
          completed: 0,
          pending: 0,
          rate: 0,
        },
      },
      { status: 200 }
    );
  }
}
