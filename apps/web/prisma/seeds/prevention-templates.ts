/**
 * Prevention Plan Template Seeds
 *
 * Sample templates for common prevention scenarios
 */

import { PrismaClient, PreventionPlanType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPreventionTemplates(userId: string) {
  console.log('🌱 Seeding prevention plan templates...');

  const templates = [
    {
      templateName: 'Plan Estándar de Prevención Cardiovascular',
      planType: 'CARDIOVASCULAR' as PreventionPlanType,
      description:
        'Protocolo integral para la prevención primaria de enfermedades cardiovasculares basado en guías AHA/ACC 2023',
      guidelineSource: 'AHA/ACC 2023',
      evidenceLevel: 'Grade A',
      goals: [
        {
          goal: 'Reducir presión arterial a <130/80 mmHg',
          category: 'Control de Presión Arterial',
          timeframe: '3 meses',
          priority: 'high',
        },
        {
          goal: 'Alcanzar LDL <100 mg/dL',
          category: 'Control Lipídico',
          timeframe: '6 meses',
          priority: 'high',
        },
        {
          goal: 'Mantener IMC entre 18.5-24.9',
          category: 'Control de Peso',
          timeframe: '12 meses',
          priority: 'medium',
        },
        {
          goal: '150 minutos de ejercicio aeróbico semanal',
          category: 'Actividad Física',
          timeframe: '3 meses',
          priority: 'medium',
        },
      ],
      recommendations: [
        {
          title: 'Control de Presión Arterial',
          description: 'Monitoreo mensual de presión arterial en consultorio y domicilio',
          category: 'Monitoreo',
          priority: 'high',
        },
        {
          title: 'Perfil Lipídico',
          description: 'Panel lipídico completo cada 6 meses',
          category: 'Laboratorio',
          priority: 'high',
        },
        {
          title: 'Dieta Cardiosaludable',
          description:
            'Dieta DASH: rica en frutas, verduras, granos enteros, baja en sodio (<2300mg/día)',
          category: 'Estilo de Vida',
          priority: 'high',
        },
        {
          title: 'Ejercicio Regular',
          description: '150 minutos de ejercicio aeróbico moderado por semana',
          category: 'Actividad Física',
          priority: 'medium',
        },
        {
          title: 'Cesación de Tabaco',
          description: 'Programa de cesación de tabaquismo si aplica',
          category: 'Estilo de Vida',
          priority: 'high',
        },
      ],
      isActive: true,
      useCount: 0,
      createdBy: userId,
    },
    {
      templateName: 'Plan de Prevención de Diabetes Tipo 2',
      planType: 'DIABETES' as PreventionPlanType,
      description:
        'Programa de prevención de diabetes para pacientes con prediabetes basado en el Programa de Prevención de Diabetes (DPP)',
      guidelineSource: 'ADA Standards of Care 2024',
      evidenceLevel: 'Grade A',
      goals: [
        {
          goal: 'Reducir peso corporal en 7%',
          category: 'Pérdida de Peso',
          timeframe: '6 meses',
          priority: 'high',
        },
        {
          goal: 'HbA1c <5.7%',
          category: 'Control Glucémico',
          timeframe: '3 meses',
          priority: 'high',
        },
        {
          goal: '150 minutos de actividad física moderada semanal',
          category: 'Actividad Física',
          timeframe: '1 mes',
          priority: 'high',
        },
        {
          goal: 'Reducir consumo de carbohidratos refinados',
          category: 'Nutrición',
          timeframe: '1 mes',
          priority: 'medium',
        },
      ],
      recommendations: [
        {
          title: 'Monitoreo de HbA1c',
          description: 'Control trimestral de hemoglobina glicosilada',
          category: 'Laboratorio',
          priority: 'high',
        },
        {
          title: 'Glucosa en Ayunas',
          description: 'Medición mensual de glucosa plasmática en ayunas',
          category: 'Laboratorio',
          priority: 'high',
        },
        {
          title: 'Plan de Alimentación',
          description:
            'Dieta baja en carbohidratos simples, alta en fibra (25-30g/día)',
          category: 'Nutrición',
          priority: 'high',
        },
        {
          title: 'Programa de Ejercicio',
          description: 'Combinación de ejercicio aeróbico y entrenamiento de resistencia',
          category: 'Actividad Física',
          priority: 'high',
        },
        {
          title: 'Educación Sobre Diabetes',
          description: 'Sesiones educativas sobre prevención y manejo de prediabetes',
          category: 'Educación',
          priority: 'medium',
        },
        {
          title: 'Metformina (si indicado)',
          description: 'Considerar metformina 850mg dos veces al día en pacientes de alto riesgo',
          category: 'Farmacoterapia',
          priority: 'medium',
        },
      ],
      isActive: true,
      useCount: 0,
      createdBy: userId,
    },
    {
      templateName: 'Prevención de Cáncer - Detección Temprana',
      planType: 'CANCER_SCREENING' as PreventionPlanType,
      description:
        'Protocolo de tamizaje y detección temprana de cánceres comunes según guías USPSTF',
      guidelineSource: 'USPSTF 2023',
      evidenceLevel: 'Grade A/B',
      goals: [
        {
          goal: 'Completar tamizaje de cáncer colorrectal',
          category: 'Detección',
          timeframe: '3 meses',
          priority: 'high',
        },
        {
          goal: 'Mamografía anual (mujeres 40-74 años)',
          category: 'Detección',
          timeframe: '12 meses',
          priority: 'high',
        },
        {
          goal: 'Citología cervical cada 3 años',
          category: 'Detección',
          timeframe: '36 meses',
          priority: 'high',
        },
        {
          goal: 'Reducir factores de riesgo modificables',
          category: 'Prevención',
          timeframe: '6 meses',
          priority: 'medium',
        },
      ],
      recommendations: [
        {
          title: 'Colonoscopia',
          description: 'Colonoscopia cada 10 años comenzando a los 45 años',
          category: 'Detección Colorrectal',
          priority: 'high',
        },
        {
          title: 'Mamografía de Tamizaje',
          description: 'Mamografía bilateral anual para mujeres 40-74 años',
          category: 'Detección Mama',
          priority: 'high',
        },
        {
          title: 'Papanicolaou + VPH',
          description: 'Citología cervical con prueba VPH cada 5 años (30-65 años)',
          category: 'Detección Cervical',
          priority: 'high',
        },
        {
          title: 'TAC de Baja Dosis',
          description: 'Tamizaje de cáncer de pulmón para fumadores de alto riesgo (50-80 años)',
          category: 'Detección Pulmón',
          priority: 'medium',
        },
        {
          title: 'Cesación de Tabaco',
          description: 'Programa intensivo de cesación tabáquica',
          category: 'Prevención',
          priority: 'high',
        },
        {
          title: 'Reducir Consumo de Alcohol',
          description: 'Limitar consumo a ≤1 bebida/día (mujeres) o ≤2 bebidas/día (hombres)',
          category: 'Prevención',
          priority: 'medium',
        },
        {
          title: 'Protección Solar',
          description: 'Uso diario de protector solar FPS 30+, evitar exposición 10am-4pm',
          category: 'Prevención',
          priority: 'medium',
        },
      ],
      isActive: true,
      useCount: 0,
      createdBy: userId,
    },
    {
      templateName: 'Plan de Vacunación del Adulto',
      planType: 'IMMUNIZATION' as PreventionPlanType,
      description:
        'Calendario completo de inmunizaciones recomendadas para adultos según CDC',
      guidelineSource: 'CDC Adult Immunization Schedule 2024',
      evidenceLevel: 'Grade A',
      goals: [
        {
          goal: 'Completar esquema de vacunación COVID-19',
          category: 'Inmunización',
          timeframe: '1 mes',
          priority: 'high',
        },
        {
          goal: 'Vacuna anual de influenza',
          category: 'Inmunización',
          timeframe: '12 meses',
          priority: 'high',
        },
        {
          goal: 'Serie completa de Tdap/Td',
          category: 'Inmunización',
          timeframe: '6 meses',
          priority: 'medium',
        },
        {
          goal: 'Vacuna contra herpes zóster (≥50 años)',
          category: 'Inmunización',
          timeframe: '3 meses',
          priority: 'medium',
        },
      ],
      recommendations: [
        {
          title: 'COVID-19',
          description: 'Serie primaria + refuerzos según indicación',
          category: 'Vacuna',
          priority: 'high',
        },
        {
          title: 'Influenza',
          description: 'Vacuna anual de influenza (octubre-marzo)',
          category: 'Vacuna',
          priority: 'high',
        },
        {
          title: 'Tdap/Td',
          description: 'Tdap una vez, luego Td cada 10 años',
          category: 'Vacuna',
          priority: 'high',
        },
        {
          title: 'Herpes Zóster (Shingrix)',
          description: '2 dosis separadas por 2-6 meses para adultos ≥50 años',
          category: 'Vacuna',
          priority: 'medium',
        },
        {
          title: 'Neumococo',
          description: 'PCV20 o PCV15+PPSV23 para adultos ≥65 años',
          category: 'Vacuna',
          priority: 'medium',
        },
        {
          title: 'Hepatitis B',
          description: 'Serie de 3 dosis para adultos sin inmunización previa',
          category: 'Vacuna',
          priority: 'low',
        },
        {
          title: 'VPH',
          description: 'Serie de 2-3 dosis para adultos hasta 26 años',
          category: 'Vacuna',
          priority: 'medium',
        },
      ],
      isActive: true,
      useCount: 0,
      createdBy: userId,
    },
    {
      templateName: 'Bienestar General y Chequeo Preventivo',
      planType: 'GENERAL_WELLNESS' as PreventionPlanType,
      description:
        'Plan integral de bienestar para adultos sanos con enfoque preventivo',
      guidelineSource: 'USPSTF + ACP Wellness Guidelines',
      evidenceLevel: 'Grade B',
      goals: [
        {
          goal: 'Examen físico anual completo',
          category: 'Evaluación',
          timeframe: '12 meses',
          priority: 'medium',
        },
        {
          goal: 'Mantener estilo de vida saludable',
          category: 'Bienestar',
          timeframe: 'continuo',
          priority: 'medium',
        },
        {
          goal: 'Salud mental óptima',
          category: 'Bienestar',
          timeframe: 'continuo',
          priority: 'medium',
        },
        {
          goal: '7-9 horas de sueño por noche',
          category: 'Sueño',
          timeframe: '1 mes',
          priority: 'medium',
        },
      ],
      recommendations: [
        {
          title: 'Examen Físico Anual',
          description: 'Evaluación completa de sistemas con signos vitales',
          category: 'Evaluación',
          priority: 'medium',
        },
        {
          title: 'Laboratorios de Rutina',
          description: 'BHC, QS, perfil lipídico, HbA1c, función tiroidea',
          category: 'Laboratorio',
          priority: 'medium',
        },
        {
          title: 'Tamizaje de Depresión',
          description: 'PHQ-9 anual para detección de depresión',
          category: 'Salud Mental',
          priority: 'medium',
        },
        {
          title: 'Evaluación de Sueño',
          description: 'Higiene del sueño y detección de trastornos',
          category: 'Sueño',
          priority: 'low',
        },
        {
          title: 'Nutrición Balanceada',
          description: 'Dieta mediterránea o DASH, 5 porciones frutas/verduras diarias',
          category: 'Nutrición',
          priority: 'medium',
        },
        {
          title: 'Manejo de Estrés',
          description: 'Técnicas de mindfulness, meditación, o yoga',
          category: 'Salud Mental',
          priority: 'low',
        },
        {
          title: 'Actividad Física Regular',
          description: '30 minutos de ejercicio moderado 5 días/semana',
          category: 'Ejercicio',
          priority: 'medium',
        },
      ],
      isActive: true,
      useCount: 0,
      createdBy: userId,
    },
  ];

  for (const template of templates) {
    await prisma.preventionPlanTemplate.create({
      data: template as any,
    });
    console.log(`  ✓ Created template: ${template.templateName}`);
  }

  console.log(`✅ Seeded ${templates.length} prevention plan templates`);
}
