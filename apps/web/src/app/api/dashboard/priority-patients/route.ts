/**
 * Priority Patients API - Intelligent Task Prioritization
 *
 * Returns prioritized list of patients based on:
 * - Urgency (high pain scores, abnormal vitals)
 * - Overdue tasks (unsigned notes, pending orders)
 * - Scheduled appointments today
 * - Recent admissions
 * - Follow-up due dates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface PriorityPatient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  tokenId: string;
  dateOfBirth: string;

  // Priority factors
  urgencyScore: number; // 0-100, higher = more urgent
  urgencyReasons: string[];

  // Vital signs
  latestPainScore?: number;
  latestVitals?: {
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    timestamp: Date;
  };

  // Tasks
  overdueNotes: number;
  pendingOrders: number;

  // Appointments
  todayAppointment?: {
    id: string;
    startTime: Date;
    type: string;
  };

  // Last visit
  lastVisit?: Date;
  daysSinceLastVisit?: number;

  // Care plan
  carePlanGoalsDue: number;
}

/**
 * Calculate urgency score based on multiple factors
 */
function calculateUrgencyScore(factors: {
  painScore?: number;
  abnormalVitals: number;
  overdueNotes: number;
  pendingOrders: number;
  hasAppointmentToday: boolean;
  daysSinceLastVisit?: number;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // High pain score (0-40 points)
  if (factors.painScore !== undefined) {
    if (factors.painScore >= 9) {
      score += 40;
      reasons.push(`Severe pain (${factors.painScore}/10)`);
    } else if (factors.painScore >= 7) {
      score += 30;
      reasons.push(`High pain (${factors.painScore}/10)`);
    } else if (factors.painScore >= 5) {
      score += 15;
      reasons.push(`Moderate pain (${factors.painScore}/10)`);
    }
  }

  // Abnormal vitals (0-30 points)
  if (factors.abnormalVitals > 0) {
    score += Math.min(30, factors.abnormalVitals * 10);
    reasons.push(`${factors.abnormalVitals} abnormal vital${factors.abnormalVitals > 1 ? 's' : ''}`);
  }

  // Overdue notes (0-20 points)
  if (factors.overdueNotes > 0) {
    score += Math.min(20, factors.overdueNotes * 5);
    reasons.push(`${factors.overdueNotes} overdue note${factors.overdueNotes > 1 ? 's' : ''}`);
  }

  // Pending orders (0-15 points)
  if (factors.pendingOrders > 0) {
    score += Math.min(15, factors.pendingOrders * 3);
    reasons.push(`${factors.pendingOrders} pending order${factors.pendingOrders > 1 ? 's' : ''}`);
  }

  // Appointment today (15 points)
  if (factors.hasAppointmentToday) {
    score += 15;
    reasons.push('Appointment scheduled today');
  }

  // Long time since last visit (0-10 points)
  if (factors.daysSinceLastVisit !== undefined && factors.daysSinceLastVisit > 90) {
    score += 10;
    reasons.push(`No visit in ${factors.daysSinceLastVisit} days`);
  } else if (factors.daysSinceLastVisit !== undefined && factors.daysSinceLastVisit > 60) {
    score += 5;
    reasons.push(`No visit in ${factors.daysSinceLastVisit} days`);
  }

  return { score: Math.min(100, score), reasons };
}

/**
 * Check if vitals are abnormal
 */
function checkAbnormalVitals(vitals: {
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
}): number {
  let abnormalCount = 0;

  // Blood pressure
  if (vitals.bloodPressure) {
    const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
    if (systolic > 180 || systolic < 90 || diastolic > 120 || diastolic < 60) {
      abnormalCount++;
    }
  }

  // Heart rate
  if (vitals.heartRate) {
    if (vitals.heartRate > 120 || vitals.heartRate < 50) {
      abnormalCount++;
    }
  }

  // Respiratory rate
  if (vitals.respiratoryRate) {
    if (vitals.respiratoryRate > 24 || vitals.respiratoryRate < 12) {
      abnormalCount++;
    }
  }

  // Temperature (assuming Celsius)
  if (vitals.temperature) {
    if (vitals.temperature > 38.5 || vitals.temperature < 35.5) {
      abnormalCount++;
    }
  }

  // Oxygen saturation
  if (vitals.oxygenSaturation) {
    if (vitals.oxygenSaturation < 92) {
      abnormalCount++;
    }
  }

  return abnormalCount;
}

/**
 * GET /api/dashboard/priority-patients
 * Fetch prioritized list of patients
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const minScore = parseInt(searchParams.get('minScore') || '0');

    // Fetch patients with relevant data
    const patients = await prisma.patient.findMany({
      where: {
        primaryCaregiverId: userId,
        isActive: true,
      },
      include: {
        painAssessments: {
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
        appointments: {
          where: {
            startTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
            status: {
              notIn: ['CANCELLED', 'COMPLETED'],
            },
          },
          orderBy: { startTime: 'asc' },
          take: 1,
        },
        soapNotes: {
          where: {
            OR: [
              { status: 'DRAFT' },
              {
                status: 'PENDING_REVIEW',
                createdAt: {
                  lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24 hours
                },
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
        },
        carePlans: {
          where: {
            targetDate: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due within 7 days
            },
            status: {
              notIn: ['COMPLETED', 'CANCELLED'],
            },
          },
        },
      },
      take: 100, // Fetch more than we need, will filter by score
    });

    // Calculate priority for each patient
    const priorityPatients: PriorityPatient[] = await Promise.all(
      patients.map(async (patient) => {
        // Get latest pain score
        const latestPainScore = patient.painAssessments[0]?.painScore;

        // Get latest vitals (would need VitalSigns model, simulating for now)
        const latestVitals = undefined; // TODO: Fetch from VitalSigns table when implemented
        const abnormalVitals = latestVitals ? checkAbnormalVitals(latestVitals) : 0;

        // Count overdue notes
        const overdueNotes = patient.soapNotes.length;

        // Count pending orders (would need Orders model, simulating for now)
        const pendingOrders = 0; // TODO: Fetch from Orders table when implemented

        // Check for today's appointment
        const todayAppointment = patient.appointments[0];

        // Calculate days since last visit
        const lastVisit = patient.soapNotes[0]?.createdAt;
        const daysSinceLastVisit = lastVisit
          ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        // Calculate urgency score
        const { score, reasons } = calculateUrgencyScore({
          painScore: latestPainScore,
          abnormalVitals,
          overdueNotes,
          pendingOrders,
          hasAppointmentToday: !!todayAppointment,
          daysSinceLastVisit,
        });

        // Count care plan goals due
        const carePlanGoalsDue = patient.carePlans?.reduce((total, plan) => total + (plan.goals?.length || 0), 0) || 0;

        return {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          mrn: patient.mrn,
          tokenId: patient.tokenId,
          dateOfBirth: patient.dateOfBirth.toISOString(),
          urgencyScore: score,
          urgencyReasons: reasons,
          latestPainScore,
          latestVitals,
          overdueNotes,
          pendingOrders,
          todayAppointment: todayAppointment
            ? {
                id: todayAppointment.id,
                startTime: todayAppointment.startTime,
                type: todayAppointment.type,
              }
            : undefined,
          lastVisit,
          daysSinceLastVisit,
          carePlanGoalsDue,
        };
      })
    );

    // Filter by minimum score and sort by urgency
    const filteredPatients = priorityPatients
      .filter((p) => p.urgencyScore >= minScore)
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, limit);

    // Calculate summary statistics
    const summary = {
      totalPatients: filteredPatients.length,
      criticalUrgency: filteredPatients.filter((p) => p.urgencyScore >= 70).length,
      highUrgency: filteredPatients.filter((p) => p.urgencyScore >= 50 && p.urgencyScore < 70).length,
      moderateUrgency: filteredPatients.filter((p) => p.urgencyScore >= 30 && p.urgencyScore < 50).length,
      lowUrgency: filteredPatients.filter((p) => p.urgencyScore < 30).length,
      totalOverdueNotes: filteredPatients.reduce((sum, p) => sum + p.overdueNotes, 0),
      totalPendingOrders: filteredPatients.reduce((sum, p) => sum + p.pendingOrders, 0),
      appointmentsToday: filteredPatients.filter((p) => p.todayAppointment).length,
    };

    // HIPAA Audit Log: Clinician accessed priority patients dashboard
    await createAuditLog({
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'READ',
      resource: 'Dashboard',
      resourceId: 'priority-patients',
      details: {
        patientCount: filteredPatients.length,
        patientIds: filteredPatients.map(p => p.id),
        criticalUrgencyCount: summary.criticalUrgency,
        highUrgencyCount: summary.highUrgency,
        minScoreFilter: minScore,
        limit,
        accessType: 'PRIORITY_PATIENTS_DASHBOARD',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      success: true,
      data: filteredPatients,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching priority patients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority patients' },
      { status: 500 }
    );
  }
}
