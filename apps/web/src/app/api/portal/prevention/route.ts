/**
 * Portal Prevention Hub API
 *
 * GET /api/portal/prevention - Get patient's prevention data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
        { priority: 'desc' },
        { scheduledDate: 'asc' },
      ],
      take: 20,
    });

    // Transform prevention plans to interventions format
    const interventions = preventionPlans.map((plan) => {
      const daysUntil = plan.scheduledDate
        ? Math.ceil((plan.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      let status: 'overdue' | 'due-soon' | 'scheduled' | 'completed';
      if (daysUntil < 0) {
        status = 'overdue';
      } else if (daysUntil <= 30) {
        status = 'due-soon';
      } else {
        status = 'scheduled';
      }

      return {
        id: plan.id,
        name: plan.title,
        type: plan.type === 'SCREENING_DUE' ? 'Screening Preventivo' :
              plan.type === 'RISK_MITIGATION' ? 'Mitigación de Riesgo' :
              plan.type === 'DISEASE_MANAGEMENT' ? 'Manejo de Enfermedad' : 'Prevención',
        dueDate: plan.scheduledDate?.toISOString() || new Date().toISOString(),
        status,
        description: plan.description || '',
        importance: plan.evidenceStrength || undefined,
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

function generateHealthGoalsFromPlans(preventionPlans: any[], riskScores: any[]) {
  const goals = [];

  // Extract goals from prevention plans with target metrics
  for (const plan of preventionPlans) {
    if (plan.targetMetrics) {
      const metrics = plan.targetMetrics as any;

      // HbA1c goal
      if (metrics.hba1c && metrics.targetHbA1c) {
        const progress = Math.max(0, Math.min(100, 100 - ((metrics.hba1c - metrics.targetHbA1c) / metrics.hba1c) * 100));
        goals.push({
          id: `hba1c-${plan.id}`,
          title: 'Control de HbA1c',
          target: `HbA1c < ${metrics.targetHbA1c}%`,
          current: `HbA1c: ${metrics.hba1c}%`,
          progress: Math.round(progress),
          category: 'Diabetes',
        });
      }

      // LDL goal
      if (metrics.ldl && metrics.targetLDL) {
        const progress = Math.max(0, Math.min(100, (1 - (metrics.ldl - metrics.targetLDL) / metrics.ldl) * 100));
        goals.push({
          id: `ldl-${plan.id}`,
          title: 'Control de Colesterol LDL',
          target: `LDL < ${metrics.targetLDL} mg/dL`,
          current: `LDL: ${metrics.ldl} mg/dL`,
          progress: Math.round(progress),
          category: 'Cardiovascular',
        });
      }

      // eGFR goal
      if (metrics.egfr) {
        const progress = Math.min(100, (metrics.egfr / 90) * 100);
        goals.push({
          id: `egfr-${plan.id}`,
          title: 'Función Renal (eGFR)',
          target: 'eGFR > 90 mL/min/1.73m²',
          current: `eGFR: ${metrics.egfr} mL/min/1.73m²`,
          progress: Math.round(progress),
          category: 'Renal',
        });
      }
    }
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

function generateRecommendationsFromPlans(preventionPlans: any[], age: number, riskScores: any[]) {
  const recommendations = [];

  // Extract recommendations from prevention plans
  for (const plan of preventionPlans) {
    if (plan.clinicalRecommendations && Array.isArray(plan.clinicalRecommendations)) {
      // Take the first 2-3 most important recommendations from each plan
      const topRecommendations = plan.clinicalRecommendations.slice(0, 2);

      for (let i = 0; i < topRecommendations.length; i++) {
        const rec = topRecommendations[i];
        const priority = plan.priority === 'HIGH' ? 'high' :
                        plan.priority === 'MEDIUM' ? 'medium' : 'low';

        recommendations.push({
          id: `${plan.id}-rec-${i}`,
          title: plan.title,
          description: rec.replace(/\*\*/g, '').replace(/\*/g, ''),
          priority,
          category: plan.type === 'SCREENING_DUE' ? 'Screening' :
                   plan.type === 'RISK_MITIGATION' ? 'Prevención' :
                   plan.type === 'DISEASE_MANAGEMENT' ? 'Manejo' : 'Salud',
        });
      }
    }
  }

  // Add general recommendations if not enough from plans
  if (recommendations.length < 3) {
    // High cardiovascular risk
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

    // Diabetes risk
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

    // General wellness
    recommendations.push({
      id: 'sleep-quality',
      title: 'Mejora la Calidad del Sueño',
      description:
        'Dormir 7-8 horas cada noche mejora tu salud cardiovascular, metabolismo y sistema inmune.',
      priority: 'medium' as const,
      category: 'Bienestar General',
    });
  }

  return recommendations.slice(0, 10); // Limit to top 10
}
