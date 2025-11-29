/**
 * Demo Patient Generator
 *
 * Creates realistic demo patients with complete medical history
 * for first-time user onboarding experience
 *
 * Showcases:
 * - SOAP notes generation
 * - Prevention screening alerts
 * - Medication management
 * - Lab results tracking
 */

import { prisma } from '@/lib/prisma';
import type { Patient } from '@prisma/client';

export interface DemoPatientConfig {
  userId: string;
  scenario: 'diabetes' | 'hypertension' | 'preventive' | 'general';
}

/**
 * Create a demo patient with realistic medical history
 *
 * @param config - Configuration for demo patient
 * @returns Created patient with complete medical record
 */
export async function createDemoPatient(config: DemoPatientConfig): Promise<Patient> {
  const { userId, scenario } = config;

  // Base patient data
  const scenarios = {
    diabetes: {
      firstName: 'María',
      lastName: 'González',
      dateOfBirth: new Date('1965-03-15'),
      gender: 'FEMALE' as const,
      phone: '+54 11 4567-8901',
      email: 'maria.gonzalez@example.com',
      address: 'Av. Corrientes 1234, CABA',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1043',
      country: 'Argentina',
      emergencyContactName: 'Juan González (esposo)',
      emergencyContactPhone: '+54 11 4567-8902',
      insuranceProvider: 'OSDE',
      insurancePolicyNumber: 'OSDE-123456',
      bloodType: 'O+',
      allergies: ['Penicilina', 'Mariscos'],
      chronicConditions: ['Diabetes tipo 2', 'Hipertensión'],
      currentMedications: ['Metformina 850mg', 'Enalapril 10mg', 'Atorvastatina 20mg'],
      notes: 'Paciente de demostración - Caso de diabetes tipo 2 con buen control',

      // Prevention scores
      diabetesRiskScore: 18, // High risk (already diagnosed)
      cvdRiskScore: 12.5, // High CVD risk
      diabetesRiskDate: new Date(),
    },

    hypertension: {
      firstName: 'Carlos',
      lastName: 'Fernández',
      dateOfBirth: new Date('1958-08-22'),
      gender: 'MALE' as const,
      phone: '+54 11 5678-9012',
      email: 'carlos.fernandez@example.com',
      address: 'Av. Santa Fe 2345, CABA',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1123',
      country: 'Argentina',
      emergencyContactName: 'Ana Fernández (hija)',
      emergencyContactPhone: '+54 11 5678-9013',
      insuranceProvider: 'Swiss Medical',
      insurancePolicyNumber: 'SM-789012',
      bloodType: 'A+',
      allergies: ['Ninguna conocida'],
      chronicConditions: ['Hipertensión arterial', 'Dislipidemia'],
      currentMedications: ['Losartán 50mg', 'Amlodipina 5mg', 'Atorvastatina 40mg', 'AAS 100mg'],
      notes: 'Paciente de demostración - Hipertensión controlada con medicación',

      cvdRiskScore: 15.2, // Very high CVD risk
      diabetesRiskScore: 8, // Moderate diabetes risk
      diabetesRiskDate: new Date(),
    },

    preventive: {
      firstName: 'Ana',
      lastName: 'Martínez',
      dateOfBirth: new Date('1985-11-30'),
      gender: 'FEMALE' as const,
      phone: '+54 11 6789-0123',
      email: 'ana.martinez@example.com',
      address: 'Av. Libertador 3456, CABA',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1425',
      country: 'Argentina',
      emergencyContactName: 'Pedro Martínez (padre)',
      emergencyContactPhone: '+54 11 6789-0124',
      insuranceProvider: 'Galeno',
      insurancePolicyNumber: 'GAL-345678',
      bloodType: 'B+',
      allergies: ['Polen'],
      chronicConditions: [],
      currentMedications: ['Anticonceptivos orales'],
      notes: 'Paciente de demostración - Consulta preventiva, sin patologías crónicas',

      cvdRiskScore: 2.1, // Low CVD risk
      diabetesRiskScore: 4, // Low diabetes risk
      diabetesRiskDate: new Date(),
    },

    general: {
      firstName: 'Roberto',
      lastName: 'Silva',
      dateOfBirth: new Date('1975-06-10'),
      gender: 'MALE' as const,
      phone: '+54 11 7890-1234',
      email: 'roberto.silva@example.com',
      address: 'Av. Belgrano 4567, CABA',
      city: 'Buenos Aires',
      state: 'CABA',
      zipCode: '1092',
      country: 'Argentina',
      emergencyContactName: 'Laura Silva (esposa)',
      emergencyContactPhone: '+54 11 7890-1235',
      insuranceProvider: 'Medicus',
      insurancePolicyNumber: 'MED-456789',
      bloodType: 'AB+',
      allergies: ['Ninguna conocida'],
      chronicConditions: ['Asma leve'],
      currentMedications: ['Salbutamol (uso ocasional)'],
      notes: 'Paciente de demostración - Caso general, paciente sano',

      cvdRiskScore: 5.3, // Moderate CVD risk
      diabetesRiskScore: 6, // Low-moderate diabetes risk
      diabetesRiskDate: new Date(),
    },
  };

  const patientData = scenarios[scenario];

  // Create demo patient
  const patient = await prisma.patient.create({
    data: {
      ...patientData,
      providerId: userId,
      isDemo: true, // Mark as demo patient
    },
  });

  // Create demo clinical note (SOAP note)
  await createDemoSOAPNote(patient.id, userId, scenario);

  // Create demo lab results
  await createDemoLabResults(patient.id, scenario);

  // Create demo vital signs
  await createDemoVitals(patient.id, scenario);

  // Create demo prevention screening alerts (if applicable)
  if (scenario === 'diabetes' || scenario === 'hypertension') {
    await createDemoPreventionAlerts(patient.id, scenario);
  }

  return patient;
}

async function createDemoSOAPNote(patientId: string, userId: string, scenario: string) {
  const soapNotes = {
    diabetes: {
      chiefComplaint: 'Control de diabetes - revisión trimestral',
      subjective: `Paciente refiere sentirse bien en general. Ha estado siguiendo la dieta indicada y tomando la medicación regularmente. Reporta episodios ocasionales de poliuria y polidipsia, especialmente después de comidas con alto contenido de carbohidratos. Niega hipoglucemias. Realiza caminatas 3 veces por semana, 30 minutos cada vez.`,
      objective: `Signos vitales: PA 135/85 mmHg, FC 78 lpm, T 36.5°C, Peso 78 kg, IMC 28.2
Examen físico: BCEG, alerta, orientada. Cardiovascular: RCR, no soplos. Pulmonar: MV presente bilateral. Abdomen: blando, depresible, no doloroso.
Pie diabético: Sensibilidad conservada, pulsos pedios presentes bilateralmente, sin lesiones.
Laboratorio reciente (hace 1 semana):
- HbA1c: 7.2% (meta <7%)
- Glucemia en ayunas: 128 mg/dL
- Colesterol total: 195 mg/dL
- LDL: 115 mg/dL
- HDL: 48 mg/dL
- Triglicéridos: 160 mg/dL
- Creatinina: 0.9 mg/dL, eGFR: 85 mL/min/1.73m²`,
      assessment: `1. Diabetes mellitus tipo 2 - en buen control metabólico (HbA1c 7.2%)
2. Hipertensión arterial - controlada con medicación
3. Dislipidemia mixta - en tratamiento
4. Sobrepeso (IMC 28.2)
5. Riesgo cardiovascular alto (score ASCVD 12.5%)`,
      plan: `1. Continuar Metformina 850mg BID, Enalapril 10mg QD, Atorvastatina 20mg QD
2. Reforzar educación diabetológica: manejo de carbohidratos
3. Objetivo: HbA1c <6.5%, aumentar intensidad de ejercicio
4. Solicitar: Microalbuminuria, fondo de ojo (último hace 11 meses)
5. Control en 3 meses con nuevos laboratorios
6. Derivar a nutrición para plan alimentario personalizado
7. Vacuna antigripal anual (pendiente)`,
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },

    hypertension: {
      chiefComplaint: 'Control de presión arterial - seguimiento',
      subjective: `Paciente refiere sentirse bien. Ha estado tomando la medicación regularmente. Presiones domiciliarias promedio 140/88 mmHg (mediciones matutinas). Niega cefalea, mareos o visión borrosa. No refiere dolor torácico ni palpitaciones. Camina 45 minutos diarios. Dieta baja en sal.`,
      objective: `Signos vitales: PA 142/90 mmHg (brazo derecho, sedente), FC 72 lpm, T 36.8°C, Peso 85 kg, IMC 29.1
Examen físico: BCEG. Cardiovascular: RCR, no soplos, no R3, no R4. Pulmonar: MV presente bilateral. Abdomen: blando, no megalias. Extremidades: sin edemas.
ECG: Ritmo sinusal, FC 70 lpm, sin alteraciones agudas.
Laboratorio (hace 2 semanas):
- Colesterol total: 220 mg/dL
- LDL: 145 mg/dL (meta <100)
- HDL: 42 mg/dL
- Triglicéridos: 165 mg/dL
- Creatinina: 1.1 mg/dL, eGFR: 75 mL/min/1.73m²
- Glucemia: 102 mg/dL`,
      assessment: `1. Hipertensión arterial - subóptimamente controlada (meta <130/80 mmHg)
2. Dislipidemia mixta - LDL por encima de meta
3. Sobrepeso (IMC 29.1)
4. Riesgo cardiovascular muy alto (score ASCVD 15.2%)
5. Función renal levemente disminuida (ERC G2)`,
      plan: `1. Ajustar medicación antihipertensiva: Aumentar Losartán a 100mg QD
2. Optimizar hipolipemiante: Aumentar Atorvastatina a 80mg QD
3. Continuar Amlodipina 5mg QD, AAS 100mg QD
4. Monitoreo domiciliario de PA (técnica HBPM)
5. Meta: PA <130/80 mmHg, LDL <100 mg/dL
6. Reforzar cambios en estilo de vida: restricción de sodio <2g/día, ejercicio aeróbico regular
7. Solicitar: Ecocardiograma (último hace 18 meses), MAPA de 24hs
8. Control en 4 semanas para reevaluar PA
9. Screening: Colonoscopía (65 años - pendiente)`,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },

    preventive: {
      chiefComplaint: 'Consulta preventiva - chequeo anual',
      subjective: `Paciente de 39 años que acude para chequeo anual. Se siente bien, niega síntomas actuales. Menstruaciones regulares, no sangrado intermenstrual. Última citología hace 2 años (normal). Niega antecedentes familiares de cáncer de mama u ovario. No fuma, consume alcohol ocasionalmente. Dieta balanceada, ejercicio regular (yoga 3x/semana).`,
      objective: `Signos vitales: PA 115/75 mmHg, FC 68 lpm, T 36.7°C, Peso 62 kg, Talla 165 cm, IMC 22.8
Examen físico: BCEG. Cardiovascular: RCR, no soplos. Pulmonar: MV presente bilateral. Mamas: sin masas palpables, sin secreción, adenopatías negativas. Abdomen: blando, depresible, no masas. Examen ginecológico: genitales externos normales, especuloscopía normal, TV: útero AVF móvil, anexos no palpables.
Laboratorio (hoy):
- Hemograma: Normal
- Glucemia: 88 mg/dL
- Perfil lipídico: Colesterol total 175 mg/dL, LDL 105 mg/dL, HDL 58 mg/dL, TG 98 mg/dL
- TSH: 2.1 mUI/L (normal)
- Vitamina D: 28 ng/mL (suficiente)`,
      assessment: `1. Paciente sana - chequeo preventivo
2. Estado nutricional normal (IMC 22.8)
3. Riesgo cardiovascular bajo (score <5%)
4. Screening oncológico al día`,
      plan: `1. Solicitar citología cervical (Papanicolau) hoy
2. Mamografía de screening (próximo año a los 40 años - programar)
3. Vacunación: refuerzo dTap, vacuna antigripal anual
4. Suplementación: Vitamina D 1000 UI/día, Calcio 1000mg/día
5. Consejería: mantener estilo de vida saludable, protección solar, autoexamen mamario mensual
6. Próximo control: 1 año o ante síntomas
7. Considerar screening colonoscopía a los 45 años`,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },

    general: {
      chiefComplaint: 'Consulta por tos y congestión nasal - 5 días de evolución',
      subjective: `Paciente refiere cuadro de 5 días de evolución caracterizado por tos seca, congestión nasal, rinorrea hialina y odinofagia leve. Niega fiebre, disnea o dolor torácico. Ha tomado paracetamol con alivio parcial. No contacto con enfermos COVID-19. Asma leve de base, sin crisis desde hace 2 años. Última crisis requirió salbutamol x 3 días.`,
      objective: `Signos vitales: PA 125/80 mmHg, FC 76 lpm, T 36.9°C, FR 16 rpm, SatO2 98% aa
Examen físico: BCEG, buen aspecto general. ORL: faringe levemente hiperémica, sin exudado. Nariz: mucosa congestiva, secreción clara. Oídos: MAE permeable bilateral. Cuello: sin adenopatías. Pulmonar: MV presente bilateral, no sibilancias, no rales. Cardiovascular: RCR, no soplos.`,
      assessment: `1. Rinofaringitis viral aguda (resfriado común)
2. Asma leve de base - estable`,
      plan: `1. Medidas generales: reposo relativo, hidratación abundante, humidificación ambiental
2. Sintomáticos: Paracetamol 500mg c/8hs PRN (fiebre/dolor), Loratadina 10mg QD x 5 días (congestión)
3. Lavados nasales con solución fisiológica
4. Signos de alarma: fiebre persistente >3 días, dificultad respiratoria, dolor torácico → reconsultar
5. Salbutamol disponible (no necesario por ahora)
6. Reposo laboral: 3 días
7. Control evolutivo: solo si empeoramiento o no mejoría en 7 días
8. No requiere antibióticos (cuadro viral)`,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  };

  const noteData = soapNotes[scenario as keyof typeof soapNotes];

  await prisma.sOAPNote.create({
    data: {
      patientId,
      providerId: userId,
      ...noteData,
      sessionType: 'CONSULTATION',
      status: 'COMPLETED',
      isDemo: true,
    },
  });
}

async function createDemoLabResults(patientId: string, scenario: string) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (scenario === 'diabetes') {
    await prisma.labResult.create({
      data: {
        patientId,
        testName: 'Hemoglobina A1c (HbA1c)',
        testDate: oneWeekAgo,
        resultValue: '7.2',
        resultUnit: '%',
        referenceRange: '4.0 - 5.6',
        status: 'COMPLETED',
        category: 'CHEMISTRY',
        interpretation: 'Valor levemente elevado - indica control glucémico subóptimo en los últimos 3 meses',
        isDemo: true,
      },
    });

    await prisma.labResult.create({
      data: {
        patientId,
        testName: 'Glucemia en ayunas',
        testDate: oneWeekAgo,
        resultValue: '128',
        resultUnit: 'mg/dL',
        referenceRange: '70 - 100',
        status: 'COMPLETED',
        category: 'CHEMISTRY',
        interpretation: 'Hiperglucemia leve en ayunas',
        isDemo: true,
      },
    });
  }

  if (scenario === 'hypertension') {
    await prisma.labResult.create({
      data: {
        patientId,
        testName: 'Colesterol LDL',
        testDate: oneWeekAgo,
        resultValue: '145',
        resultUnit: 'mg/dL',
        referenceRange: '< 100 (alto riesgo CV)',
        status: 'COMPLETED',
        category: 'CHEMISTRY',
        interpretation: 'Valor por encima de la meta para paciente de alto riesgo cardiovascular',
        isDemo: true,
      },
    });
  }
}

async function createDemoVitals(patientId: string, scenario: string) {
  const vitalsData = {
    diabetes: {
      bloodPressureSystolic: 135,
      bloodPressureDiastolic: 85,
      heartRate: 78,
      temperature: 36.5,
      weight: 78,
      height: 165,
      bmi: 28.2,
    },
    hypertension: {
      bloodPressureSystolic: 142,
      bloodPressureDiastolic: 90,
      heartRate: 72,
      temperature: 36.8,
      weight: 85,
      height: 170,
      bmi: 29.4,
    },
    preventive: {
      bloodPressureSystolic: 115,
      bloodPressureDiastolic: 75,
      heartRate: 68,
      temperature: 36.7,
      weight: 62,
      height: 165,
      bmi: 22.8,
    },
    general: {
      bloodPressureSystolic: 125,
      bloodPressureDiastolic: 80,
      heartRate: 76,
      temperature: 36.9,
      weight: 75,
      height: 175,
      bmi: 24.5,
    },
  };

  // Note: You would create VitalSign records here if the model exists
  // For now, this is a placeholder showing the structure
}

async function createDemoPreventionAlerts(patientId: string, scenario: string) {
  if (scenario === 'diabetes') {
    // Create prevention screening alerts for diabetic patient
    await prisma.preventionPlan.create({
      data: {
        patientId,
        planName: 'Screening de retinopatía diabética',
        planType: 'SCREENING_DUE',
        description: 'Fondo de ojo para detección temprana de retinopatía diabética',
        clinicalRecommendations: [
          'Realizar fondo de ojo dilatado anualmente',
          'Última realización hace 11 meses - vence próximo mes',
          'Derivar a oftalmología si retinopatía detectada',
        ],
        evidenceLevel: 'A - Recomendación fuerte con evidencia de alta calidad',
        isDemo: true,
      },
    });

    await prisma.preventionPlan.create({
      data: {
        patientId,
        planName: 'Screening de nefropatía diabética',
        planType: 'SCREENING_DUE',
        description: 'Microalbuminuria anual para detección de nefropatía',
        clinicalRecommendations: [
          'Solicitar microalbuminuria en orina de 24hs',
          'Monitorear creatinina y eGFR cada 6 meses',
          'Meta: eGFR >60 mL/min/1.73m²',
        ],
        evidenceLevel: 'A - Recomendación fuerte',
        isDemo: true,
      },
    });
  }
}

/**
 * Delete all demo patients for a user
 *
 * @param userId - User ID
 */
export async function deleteDemoPatients(userId: string) {
  await prisma.patient.deleteMany({
    where: {
      providerId: userId,
      isDemo: true,
    },
  });
}

/**
 * Check if user has demo patients
 *
 * @param userId - User ID
 * @returns true if user has demo patients
 */
export async function hasDemoPatients(userId: string): Promise<boolean> {
  const count = await prisma.patient.count({
    where: {
      providerId: userId,
      isDemo: true,
    },
  });

  return count > 0;
}
