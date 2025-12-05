/**
 * Portal Prevention Hub API
 *
 * GET /api/portal/prevention - Get patient's prevention data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { PreventionPlan } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();
    const patientId = session.patientId;

    // Fetch patient details for age calculation and risk scores
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        dateOfBirth: true,
        gender: true,
        cvdRiskScore: true,
        diabetesRiskScore: true,
        diabetesRiskDate: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Calculate age
    const age = calculateAge(patient.dateOfBirth);

    // Fetch real risk scores from patient record
    const riskScores = [];

    // CVD Risk
    if (patient.cvdRiskScore) {
      const level = patient.cvdRiskScore < 5 ? 'low' : patient.cvdRiskScore < 7.5 ? 'moderate' : patient.cvdRiskScore < 20 ? 'high' : 'very-high';
      riskScores.push({
        id: 'cvd',
        name: 'Riesgo Cardiovascular (CVD)',
        score: patient.cvdRiskScore,
        level,
        description: 'Probabilidad de enfermedad cardiovascular en los próximos 10 años',
        explanation: 'Este score evalúa tu riesgo de infarto, derrame cerebral y otras enfermedades del corazón. Se basa en edad, presión arterial, colesterol y otros factores.',
        lastCalculated: new Date().toISOString(),
      });
    }

    // Diabetes Risk
    if (patient.diabetesRiskScore) {
      const level = patient.diabetesRiskScore < 7 ? 'low' : patient.diabetesRiskScore < 12 ? 'moderate' : patient.diabetesRiskScore < 15 ? 'high' : 'very-high';
      riskScores.push({
        id: 'diabetes',
        name: 'Riesgo de Diabetes',
        score: patient.diabetesRiskScore,
        level,
        description: 'Probabilidad de desarrollar diabetes tipo 2',
        explanation: 'Este score considera tu IMC, circunferencia de cintura, actividad física, dieta y antecedentes familiares para estimar tu riesgo.',
        lastCalculated: patient.diabetesRiskDate?.toISOString() || new Date().toISOString(),
      });
    }

    // If no risk scores, generate mock ones
    if (riskScores.length === 0) {
      riskScores.push(...generateMockRiskScores(age, patient.gender || 'UNKNOWN'));
    }

    // Fetch ACTIVE prevention plans from database
    const preventionPlans = await prisma.preventionPlan.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
      },
      orderBy: [
        { updatedAt: 'desc' },
        { activatedAt: 'desc' },
      ],
      take: 20,
    });

    // Transform prevention plans to interventions format
    const interventions = preventionPlans.map((plan) => {
      const followUpSchedule = (plan.followUpSchedule as Record<string, any> | null) || null;
      const nextDateValue =
        (followUpSchedule && (followUpSchedule.nextDate || followUpSchedule.nextCheckIn || followUpSchedule.date)) || null;

      const scheduledDate = nextDateValue
        ? new Date(nextDateValue)
        : plan.reviewedAt || plan.completedAt || plan.activatedAt || new Date();

      const daysUntil = Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      let status: 'overdue' | 'due-soon' | 'scheduled' | 'completed';
      if (plan.status === 'COMPLETED') {
        status = 'completed';
      } else if (daysUntil < 0) {
        status = 'overdue';
      } else if (daysUntil <= 30) {
        status = 'due-soon';
      } else {
        status = 'scheduled';
      }

      return {
        id: plan.id,
        name: plan.planName,
        type: formatPlanType(plan.planType),
        dueDate: scheduledDate.toISOString(),
        status,
        description: plan.description || '',
        importance: plan.evidenceLevel || undefined,
      };
    });

    // Fetch upcoming appointments that are preventive screenings
    const preventiveAppointments = await prisma.appointment.findMany({
      where: {
        patientId,
        startTime: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
      select: {
        id: true,
        startTime: true,
        description: true,
        clinician: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
    });

    // Add appointments to interventions
    interventions.push(...preventiveAppointments.map((apt) => {
      const daysUntil = Math.ceil(
        (new Date(apt.startTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      let status: 'overdue' | 'due-soon' | 'scheduled' | 'completed';
      if (daysUntil < 0) {
        status = 'overdue';
      } else if (daysUntil <= 30) {
        status = 'due-soon';
      } else {
        status = 'scheduled';
      }

      return {
        id: apt.id,
        name: `Consulta con Dr. ${apt.clinician.firstName} ${apt.clinician.lastName}`,
        type: apt.clinician.specialty || 'Consulta General',
        dueDate: apt.startTime.toISOString(),
        status,
        description: apt.description || 'Consulta preventiva programada',
        importance: daysUntil <= 7 ? 'Tu cita está muy próxima. No olvides asistir.' : undefined,
      };
    }));

    // Generate health goals based on prevention plans
    const goals = generateHealthGoalsFromPlans(preventionPlans, riskScores);

    // Generate personalized recommendations from prevention plans
    const recommendations = generateRecommendationsFromPlans(preventionPlans, age, riskScores);

    return NextResponse.json({
      success: true,
      riskScores,
      interventions,
      goals,
      recommendations,
    });
  } catch (error) {
    logger.error({
      event: 'portal_prevention_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar los datos de prevención.',
        riskScores: [],
        interventions: [],
        goals: [],
        recommendations: [],
      },
      { status: 500 }
    );
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function generateMockRiskScores(age: number, gender: string) {
  const scores = [];

  // ASCVD Risk Score (10-year cardiovascular disease risk)
  if (age >= 40) {
    const baseRisk = age >= 60 ? 15 : 8;
    const risk = baseRisk + Math.random() * 5;
    scores.push({
      id: 'ascvd',
      name: 'Riesgo Cardiovascular (ASCVD)',
      score: Math.round(risk * 10) / 10,
      level: risk < 5 ? 'low' : risk < 7.5 ? 'moderate' : risk < 20 ? 'high' : 'very-high',
      description: `Probabilidad de enfermedad cardiovascular en los próximos 10 años`,
      explanation: `Este score evalúa tu riesgo de infarto, derrame cerebral y otras enfermedades del corazón. Se basa en edad, presión arterial, colesterol y otros factores.`,
      lastCalculated: new Date().toISOString(),
    });
  }

  // Diabetes Risk (FINDRISC)
  const diabetesRisk = 5 + Math.random() * 15;
  scores.push({
    id: 'diabetes',
    name: 'Riesgo de Diabetes',
    score: Math.round(diabetesRisk),
    level: diabetesRisk < 7 ? 'low' : diabetesRisk < 12 ? 'moderate' : diabetesRisk < 15 ? 'high' : 'very-high',
    description: 'Probabilidad de desarrollar diabetes tipo 2',
    explanation: 'Este score considera tu IMC, circunferencia de cintura, actividad física, dieta y antecedentes familiares para estimar tu riesgo.',
    lastCalculated: new Date().toISOString(),
  });

  // Fracture Risk (FRAX) - for older patients
  if (age >= 50) {
    const fractureRisk = 3 + Math.random() * 12;
    scores.push({
      id: 'frax',
      name: 'Riesgo de Fractura (FRAX)',
      score: Math.round(fractureRisk * 10) / 10,
      level: fractureRisk < 5 ? 'low' : fractureRisk < 10 ? 'moderate' : fractureRisk < 15 ? 'high' : 'very-high',
      description: 'Probabilidad de fractura ósea en 10 años',
      explanation: 'Evalúa el riesgo de fracturas osteoporóticas considerando densidad ósea, edad, género y otros factores de riesgo.',
      lastCalculated: new Date().toISOString(),
    });
  }

  return scores;
}

function getRecommendedScreenings(age: number, gender: string) {
  const screenings = [];

  // Colonoscopy
  if (age >= 45 && age <= 75) {
    screenings.push({
      id: 'colonoscopy',
      name: 'Colonoscopía',
      type: 'Screening Oncológico',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'due-soon' as const,
      description: 'Detección temprana de cáncer colorrectal',
      importance: 'Recomendado cada 10 años a partir de los 45 años',
    });
  }

  // Mammography for women
  if (gender === 'female' && age >= 40) {
    screenings.push({
      id: 'mammography',
      name: 'Mamografía',
      type: 'Screening Oncológico',
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'due-soon' as const,
      description: 'Detección temprana de cáncer de mama',
      importance: 'Recomendado anualmente para mujeres de 40+ años',
    });
  }

  // Lipid panel
  if (age >= 35) {
    screenings.push({
      id: 'lipid-panel',
      name: 'Panel de Lípidos',
      type: 'Análisis de Sangre',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'due-soon' as const,
      description: 'Evaluación de colesterol y triglicéridos',
      importance: 'Control anual recomendado',
    });
  }

  return screenings;
}

function generateHealthGoalsFromPlans(preventionPlans: PreventionPlan[], riskScores: any[]) {
  const goals = [];

  for (const plan of preventionPlans) {
    const planGoals = Array.isArray(plan.goals as any) ? ((plan.goals as any[]) ?? []) : [];

    planGoals.forEach((goalData: any, index: number) => {
      if (!goalData || typeof goalData !== 'object') {
        return;
      }

      const title = goalData.title || goalData.goal || plan.planName || 'Meta de salud';
      const target = goalData.target || goalData.targetValue || 'Objetivo personalizado';
      const current = goalData.current || goalData.status || '';
      let progress = typeof goalData.progress === 'number'
        ? goalData.progress
        : goalData.status === 'COMPLETED'
          ? 100
          : 50;

      progress = Math.max(0, Math.min(100, Math.round(progress)));

      goals.push({
        id: `${plan.id}-goal-${index}`,
        title,
        target,
        current,
        progress,
        category: goalData.category || mapPlanTypeToCategory(plan.planType),
      });
    });
  }

  // Default goals if none from plans
  if (goals.length === 0) {
    goals.push({
      id: 'weight',
      title: 'Control de Peso',
      target: 'IMC entre 18.5 - 24.9',
      current: 'IMC: 26.3',
      progress: 65,
      category: 'Nutrición',
    });

    goals.push({
      id: 'exercise',
      title: 'Actividad Física',
      target: '150 minutos por semana',
      current: '90 minutos esta semana',
      progress: 60,
      category: 'Ejercicio',
    });
  }

  return goals;
}

function generateRecommendationsFromPlans(preventionPlans: PreventionPlan[], age: number, riskScores: any[]) {
  const recommendations = [];

  for (const plan of preventionPlans) {
    const planRecs = Array.isArray(plan.recommendations as any) ? ((plan.recommendations as any[]) ?? []) : [];

    planRecs.slice(0, 2).forEach((rec: any, index: number) => {
      const description = typeof rec === 'string'
        ? rec
        : rec?.description || rec?.text || rec?.recommendation || '';

      if (!description) {
        return;
      }

      const priorityValue = typeof rec?.priority === 'string'
        ? rec.priority.toLowerCase()
        : derivePriorityFromPlan(plan);

      recommendations.push({
        id: `${plan.id}-rec-${index}`,
        title: rec?.title || plan.planName,
        description: description.replace(/\*\*/g, '').replace(/\*/g, ''),
        priority: priorityValue,
        category: rec?.category || mapPlanTypeToCategory(plan.planType),
      });
    });

    if (plan.lifestyleChanges) {
      recommendations.push({
        id: `${plan.id}-lifestyle`,
        title: `${plan.planName} - Cambios de estilo de vida`,
        description: plan.lifestyleChanges,
        priority: derivePriorityFromPlan(plan),
        category: mapPlanTypeToCategory(plan.planType),
      });
    }
  }

  if (recommendations.length < 3) {
    const cvRisk = riskScores.find((s) => s.id === 'ascvd');
    if (cvRisk && (cvRisk.level === 'high' || cvRisk.level === 'very-high')) {
      recommendations.push({
        id: 'cardio-lifestyle',
        title: 'Mejora tu Salud Cardiovascular',
        description:
          'Considera aumentar tu actividad física a 30 minutos diarios, reducir el consumo de sal y mantener un peso saludable.',
        priority: 'high' as const,
        category: 'Cardiovascular',
      });
    }

    const diabetesRisk = riskScores.find((s) => s.id === 'diabetes');
    if (diabetesRisk && (diabetesRisk.level === 'moderate' || diabetesRisk.level === 'high')) {
      recommendations.push({
        id: 'diabetes-prevention',
        title: 'Prevención de Diabetes',
        description:
          'Reduce el consumo de azúcares refinados. Aumenta la ingesta de fibra y verduras. El ejercicio regular es clave.',
        priority: 'high' as const,
        category: 'Metabolismo',
      });
    }

    recommendations.push({
      id: 'sleep-quality',
      title: 'Mejora la Calidad del Sueño',
      description:
        'Dormir 7-8 horas cada noche mejora tu salud cardiovascular, metabolismo y sistema inmune.',
      priority: 'medium' as const,
      category: 'Bienestar General',
    });
  }

  return recommendations.slice(0, 10);
}

function formatPlanType(planType: PreventionPlan['planType']): string {
  switch (planType) {
    case 'CARDIOVASCULAR':
      return 'Prevención Cardiovascular';
    case 'DIABETES':
      return 'Prevención de Diabetes';
    case 'HYPERTENSION':
      return 'Manejo de Hipertensión';
    case 'OBESITY':
      return 'Control de Peso';
    case 'CANCER_SCREENING':
      return 'Screening Oncológico';
    case 'COMPREHENSIVE':
      return 'Prevención Integral';
    default:
      return 'Prevención';
  }
}

function mapPlanTypeToCategory(planType: PreventionPlan['planType']): string {
  switch (planType) {
    case 'CARDIOVASCULAR':
      return 'Cardiovascular';
    case 'DIABETES':
      return 'Metabolismo';
    case 'HYPERTENSION':
      return 'Presión arterial';
    case 'OBESITY':
      return 'Nutrición';
    case 'CANCER_SCREENING':
      return 'Screening';
    case 'COMPREHENSIVE':
      return 'Salud Integral';
    default:
      return 'Salud';
  }
}

function derivePriorityFromPlan(plan: PreventionPlan): 'high' | 'medium' | 'low' {
  switch (plan.planType) {
    case 'CARDIOVASCULAR':
    case 'DIABETES':
      return 'high';
    case 'CANCER_SCREENING':
    case 'HYPERTENSION':
      return 'medium';
    default:
      return 'low';
  }
}
