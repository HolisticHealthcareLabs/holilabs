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

    // Fetch patient details for age calculation
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        dateOfBirth: true,
        gender: true,
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

    // Mock risk scores (in production, these would be calculated from actual health data)
    const riskScores = generateMockRiskScores(age, patient.gender || 'UNKNOWN');

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

    // Transform to interventions format
    const interventions = preventiveAppointments.map((apt) => {
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
    });

    // Add age-appropriate screenings
    const recommendedScreenings = getRecommendedScreenings(age, patient.gender || 'UNKNOWN');
    interventions.push(...recommendedScreenings);

    // Generate health goals (mock data)
    const goals = generateHealthGoals(riskScores);

    // Generate personalized recommendations
    const recommendations = generateRecommendations(age, riskScores);

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

function generateHealthGoals(riskScores: any[]) {
  const goals = [];

  // Weight management goal
  goals.push({
    id: 'weight',
    title: 'Control de Peso',
    target: 'IMC entre 18.5 - 24.9',
    current: 'IMC: 26.3',
    progress: 65,
    category: 'Nutrición',
  });

  // Physical activity
  goals.push({
    id: 'exercise',
    title: 'Actividad Física',
    target: '150 minutos por semana',
    current: '90 minutos esta semana',
    progress: 60,
    category: 'Ejercicio',
  });

  // Blood pressure
  const hasHighCardioRisk = riskScores.some(
    (s) => s.id === 'ascvd' && (s.level === 'high' || s.level === 'very-high')
  );

  if (hasHighCardioRisk) {
    goals.push({
      id: 'blood-pressure',
      title: 'Presión Arterial',
      target: 'Menos de 120/80 mmHg',
      current: '128/82 mmHg',
      progress: 75,
      category: 'Cardiovascular',
    });
  }

  return goals;
}

function generateRecommendations(age: number, riskScores: any[]) {
  const recommendations = [];

  // High cardiovascular risk
  const cvRisk = riskScores.find((s) => s.id === 'ascvd');
  if (cvRisk && (cvRisk.level === 'high' || cvRisk.level === 'very-high')) {
    recommendations.push({
      id: 'cardio-lifestyle',
      title: 'Mejora tu Salud Cardiovascular',
      description:
        'Considera aumentar tu actividad física a 30 minutos diarios, reducir el consumo de sal y mantener un peso saludable. Consulta con tu médico sobre posibles medicamentos preventivos.',
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
        'Reduce el consumo de azúcares refinados y carbohidratos simples. Aumenta la ingesta de fibra y verduras. El ejercicio regular es clave para prevenir la diabetes tipo 2.',
      priority: 'high' as const,
      category: 'Metabolismo',
    });
  }

  // General wellness
  recommendations.push({
    id: 'sleep-quality',
    title: 'Mejora la Calidad del Sueño',
    description:
      'Dormir 7-8 horas cada noche mejora tu salud cardiovascular, metabolismo y sistema inmune. Establece una rutina de sueño consistente.',
    priority: 'medium' as const,
    category: 'Bienestar General',
  });

  // Stress management
  if (age >= 30) {
    recommendations.push({
      id: 'stress-management',
      title: 'Manejo del Estrés',
      description:
        'El estrés crónico aumenta el riesgo de enfermedades cardiovasculares. Considera practicar meditación, yoga o técnicas de respiración profunda.',
      priority: 'medium' as const,
      category: 'Salud Mental',
    });
  }

  // Nutrition
  recommendations.push({
    id: 'nutrition',
    title: 'Alimentación Balanceada',
    description:
      'Una dieta rica en frutas, verduras, granos enteros y proteínas magras reduce el riesgo de múltiples enfermedades crónicas.',
    priority: 'low' as const,
    category: 'Nutrición',
  });

  return recommendations;
}
