/**
 * Generate Demo Medical Documents
 *
 * Creates 30 realistic medical documents for demo mode including:
 * - Medical history forms
 * - Lab results
 * - Prescription forms
 * - Consultation notes
 * - Imaging reports
 */

import { generateDemoPatients, type DemoPatient } from './demo-data-generator';

export interface DemoDocument {
  id: string;
  patientId: string;
  patientName: string;
  type: 'medical_history' | 'lab_result' | 'prescription' | 'consultation_note' | 'imaging_report' | 'intake_form';
  title: string;
  content: string;
  date: Date;
  provider: string;
  metadata: {
    fileSize: number;
    mimeType: string;
    containsPHI: boolean;
  };
}

const PROVIDERS = [
  'Dr. María Rodríguez',
  'Dr. Carlos Martínez',
  'Dr. Ana López',
  'Dr. José García',
  'Dr. Elena Sánchez',
];

const LAB_TESTS = {
  COMPLETE_BLOOD_COUNT: {
    name: 'Hemograma Completo',
    parameters: [
      { name: 'Hemoglobina', unit: 'g/dL', normalRange: '13.5-17.5 (M) / 12-15.5 (F)' },
      { name: 'Hematocrito', unit: '%', normalRange: '38.3-48.6 (M) / 35.5-44.9 (F)' },
      { name: 'Leucocitos', unit: '×10³/μL', normalRange: '4.5-11.0' },
      { name: 'Plaquetas', unit: '×10³/μL', normalRange: '150-400' },
    ],
  },
  LIPID_PANEL: {
    name: 'Perfil Lipídico',
    parameters: [
      { name: 'Colesterol Total', unit: 'mg/dL', normalRange: '<200' },
      { name: 'LDL', unit: 'mg/dL', normalRange: '<100' },
      { name: 'HDL', unit: 'mg/dL', normalRange: '>40 (M) / >50 (F)' },
      { name: 'Triglicéridos', unit: 'mg/dL', normalRange: '<150' },
    ],
  },
  GLUCOSE: {
    name: 'Glucosa en Ayunas',
    parameters: [
      { name: 'Glucosa', unit: 'mg/dL', normalRange: '70-100' },
    ],
  },
  HBA1C: {
    name: 'Hemoglobina Glicosilada (HbA1c)',
    parameters: [
      { name: 'HbA1c', unit: '%', normalRange: '<5.7' },
    ],
  },
};

function generateMedicalHistoryForm(patient: DemoPatient, index: number): DemoDocument {
  const date = new Date(patient.lastVisit);
  date.setMonth(date.getMonth() - 6);

  const content = `
FORMULARIO DE HISTORIA CLÍNICA

INFORMACIÓN DEL PACIENTE
Nombre: ${patient.firstName} ${patient.lastName}
Fecha de Nacimiento: ${patient.dateOfBirth.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
Género: ${patient.gender === 'MALE' ? 'Masculino' : patient.gender === 'FEMALE' ? 'Femenino' : 'Otro'}
Teléfono: ${patient.phone}
Email: ${patient.email}

ANTECEDENTES MÉDICOS
Condiciones Actuales:
${patient.conditions.map(c => `• ${c}`).join('\n')}

Medicamentos Actuales:
${patient.medications.map(m => `• ${m.name} ${m.dosage} - ${m.frequency}`).join('\n')}

ALERGIAS
${Math.random() > 0.7 ? '• Penicilina\n• Aspirina' : 'Sin alergias conocidas'}

ANTECEDENTES FAMILIARES
${Math.random() > 0.5 ? '• Diabetes tipo 2 (padre)\n• Hipertensión (madre)' : 'Sin antecedentes familiares relevantes'}

HÁBITOS
Tabaquismo: ${Math.random() > 0.8 ? 'Sí (10 cigarrillos/día)' : 'No'}
Alcohol: ${Math.random() > 0.6 ? 'Ocasional (1-2 copas/semana)' : 'No'}
Ejercicio: ${Math.random() > 0.5 ? '3 veces por semana' : 'Sedentario'}

VACUNACIÓN
✓ Influenza (${new Date().getFullYear()})
✓ COVID-19 (Refuerzo ${new Date().getFullYear() - 1})
${Math.random() > 0.5 ? '✓ Neumococo' : ''}

Fecha de elaboración: ${date.toLocaleDateString('es-MX')}
Elaborado por: ${PROVIDERS[index % PROVIDERS.length]}
`;

  return {
    id: `demo-doc-history-${index}`,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    type: 'medical_history',
    title: 'Historia Clínica',
    content,
    date,
    provider: PROVIDERS[index % PROVIDERS.length],
    metadata: {
      fileSize: content.length,
      mimeType: 'text/plain',
      containsPHI: true,
    },
  };
}

function generateLabResult(patient: DemoPatient, index: number): DemoDocument {
  const date = new Date(patient.lastVisit);
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));

  const testType = Object.keys(LAB_TESTS)[index % Object.keys(LAB_TESTS).length] as keyof typeof LAB_TESTS;
  const test = LAB_TESTS[testType];

  const generateValue = (normalRange: string) => {
    const isAbnormal = Math.random() > 0.7;
    if (normalRange.includes('<')) {
      const max = parseFloat(normalRange.replace('<', ''));
      return isAbnormal ? (max + Math.random() * 50).toFixed(1) : (max * Math.random() * 0.9).toFixed(1);
    }
    if (normalRange.includes('>')) {
      const min = parseFloat(normalRange.replace('>', '').split(' ')[0]);
      return isAbnormal ? (min * 0.7).toFixed(1) : (min + Math.random() * 20).toFixed(1);
    }
    const [min, max] = normalRange.split('-').map(v => parseFloat(v.split(' ')[0]));
    return isAbnormal
      ? (max + Math.random() * (max * 0.3)).toFixed(1)
      : (min + Math.random() * (max - min)).toFixed(1);
  };

  const results = test.parameters.map(param => {
    const value = generateValue(param.normalRange);
    const numValue = parseFloat(value);
    const [min, max] = param.normalRange.split('-').map(v => parseFloat(v.replace(/[<>]/g, '').split(' ')[0]));
    const isNormal = !param.normalRange.includes('<') && !param.normalRange.includes('>')
      ? numValue >= min && numValue <= max
      : param.normalRange.includes('<')
      ? numValue < parseFloat(param.normalRange.replace('<', ''))
      : numValue > parseFloat(param.normalRange.replace('>', '').split(' ')[0]);

    return {
      ...param,
      value,
      status: isNormal ? 'NORMAL' : 'ANORMAL',
    };
  });

  const content = `
RESULTADOS DE LABORATORIO

PACIENTE: ${patient.firstName} ${patient.lastName}
FECHA DE NACIMIENTO: ${patient.dateOfBirth.toLocaleDateString('es-MX')}
FECHA DE RECOLECCIÓN: ${date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

ESTUDIO: ${test.name}

RESULTADOS:
${results.map(r => `
${r.name}:
  Valor: ${r.value} ${r.unit}
  Rango de Referencia: ${r.normalRange}
  Estado: ${r.status}
`).join('\n')}

OBSERVACIONES:
${results.some(r => r.status === 'ANORMAL')
  ? 'Se detectan valores fuera del rango normal. Se recomienda consulta con especialista.'
  : 'Todos los parámetros dentro de rangos normales.'}

MÉDICO TRATANTE: ${PROVIDERS[index % PROVIDERS.length]}
LABORATORIO: LabMéxico - Certificación ISO 15189

Este reporte es confidencial y está destinado únicamente para el paciente y su médico tratante.
`;

  return {
    id: `demo-doc-lab-${index}`,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    type: 'lab_result',
    title: `Laboratorio: ${test.name}`,
    content,
    date,
    provider: PROVIDERS[index % PROVIDERS.length],
    metadata: {
      fileSize: content.length,
      mimeType: 'text/plain',
      containsPHI: true,
    },
  };
}

function generatePrescription(patient: DemoPatient, index: number): DemoDocument {
  const date = new Date(patient.lastVisit);

  const medication = patient.medications.length > 0
    ? patient.medications[Math.floor(Math.random() * patient.medications.length)]
    : { name: 'Acetaminofén', dosage: '500mg', frequency: '3 veces al día' };

  const content = `
RECETA MÉDICA

INFORMACIÓN DEL PACIENTE
Nombre: ${patient.firstName} ${patient.lastName}
Fecha de Nacimiento: ${patient.dateOfBirth.toLocaleDateString('es-MX')}
Dirección: ${patient.region}

MEDICAMENTO PRESCRITO
Nombre: ${medication.name}
Dosis: ${medication.dosage}
Frecuencia: ${medication.frequency}
Vía de Administración: Oral
Duración del Tratamiento: 30 días

INDICACIONES
${medication.name === 'Metformin' ? 'Tomar con alimentos. Monitorear niveles de glucosa.' : ''}
${medication.name === 'Lisinopril' ? 'Tomar en ayunas. Monitorear presión arterial.' : ''}
${medication.name === 'Atorvastatin' ? 'Tomar antes de dormir. Evitar jugo de toronja.' : ''}
${medication.name === 'Albuterol' ? 'Usar inhalador cuando presente dificultad respiratoria.' : ''}
${medication.name === 'Omeprazole' ? 'Tomar 30 minutos antes del desayuno.' : ''}
${medication.name === 'Levothyroxine' ? 'Tomar en ayunas, 30 minutos antes del desayuno.' : ''}
${medication.name === 'Gabapentin' ? 'Puede causar somnolencia. No conducir.' : ''}

RECOMENDACIONES
• No suspender el tratamiento sin consultar al médico
• Reportar efectos adversos inmediatamente
• Mantener en lugar fresco y seco

MÉDICO PRESCRIPTOR
Nombre: ${PROVIDERS[index % PROVIDERS.length]}
Cédula Profesional: ${8000000 + index * 1234}
Teléfono: +52 55 ${1000 + index * 111} ${2000 + index * 222}

Fecha de Emisión: ${date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
Vigencia: 30 días

Esta receta es válida por única vez. No se aceptan alteraciones.
`;

  return {
    id: `demo-doc-rx-${index}`,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    type: 'prescription',
    title: `Prescripción: ${medication.name}`,
    content,
    date,
    provider: PROVIDERS[index % PROVIDERS.length],
    metadata: {
      fileSize: content.length,
      mimeType: 'text/plain',
      containsPHI: true,
    },
  };
}

function generateConsultationNote(patient: DemoPatient, index: number): DemoDocument {
  const date = patient.lastVisit;

  const complaints = [
    'Dolor de cabeza persistente',
    'Fatiga generalizada',
    'Dolor torácico ocasional',
    'Dificultad para dormir',
    'Dolor abdominal',
    'Tos seca',
    'Mareos',
  ];

  const complaint = complaints[index % complaints.length];
  const medication = patient.medications[0] || { name: 'Acetaminofén', dosage: '500mg', frequency: '3 veces al día' };

  const content = `
NOTA DE CONSULTA MÉDICA

FECHA: ${date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
MÉDICO: ${PROVIDERS[index % PROVIDERS.length]}

DATOS DEL PACIENTE
Nombre: ${patient.firstName} ${patient.lastName}
Edad: ${new Date().getFullYear() - patient.dateOfBirth.getFullYear()} años
Género: ${patient.gender === 'MALE' ? 'Masculino' : 'Femenino'}

MOTIVO DE CONSULTA
${complaint}

HISTORIA DE LA ENFERMEDAD ACTUAL
Paciente refiere síntomas de ${Math.floor(Math.random() * 14) + 1} días de evolución.
${Math.random() > 0.5 ? 'Síntomas han empeorado gradualmente.' : 'Síntomas se mantienen estables.'}
${Math.random() > 0.7 ? 'Ha tomado medicamentos de venta libre sin mejoría significativa.' : ''}

SIGNOS VITALES
Presión Arterial: ${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)} mmHg
Frecuencia Cardíaca: ${60 + Math.floor(Math.random() * 40)} lpm
Frecuencia Respiratoria: ${14 + Math.floor(Math.random() * 6)} rpm
Temperatura: ${36 + Math.random() * 1.5}°C
Saturación O2: ${95 + Math.floor(Math.random() * 5)}%
Peso: ${50 + Math.floor(Math.random() * 50)} kg
IMC: ${18 + Math.random() * 12}

EXAMEN FÍSICO
General: ${Math.random() > 0.7 ? 'Paciente en buen estado general' : 'Paciente consciente, orientado'}
Cardiopulmonar: Ruidos cardíacos rítmicos, sin soplos. Campos pulmonares bien ventilados.
Abdomen: Blando, depresible, no doloroso a la palpación.

DIAGNÓSTICO
${complaint} - En evaluación

PLAN DE TRATAMIENTO
${patient.conditions.includes('Hypertension') ? '• Continuar con antihipertensivos\n' : ''}
${patient.conditions.includes('Type 2 Diabetes') ? '• Control glucémico\n' : ''}
• ${medication.name} ${medication.dosage} - ${medication.frequency}
• Control en 15 días
${Math.random() > 0.6 ? '• Solicitar estudios de laboratorio' : ''}

RECOMENDACIONES
• Dieta balanceada
• Ejercicio moderado 30 min/día
• Evitar automedicación
• Acudir a urgencias si los síntomas empeoran

${PROVIDERS[index % PROVIDERS.length]}
Cédula Profesional: ${8000000 + index * 1234}
`;

  return {
    id: `demo-doc-note-${index}`,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    type: 'consultation_note',
    title: `Consulta: ${complaint}`,
    content,
    date,
    provider: PROVIDERS[index % PROVIDERS.length],
    metadata: {
      fileSize: content.length,
      mimeType: 'text/plain',
      containsPHI: true,
    },
  };
}

/**
 * Generate all 30 demo documents
 */
export function generateAllDemoDocuments(): DemoDocument[] {
  const patients = generateDemoPatients(30);
  const documents: DemoDocument[] = [];

  patients.forEach((patient, index) => {
    // Each patient gets one document, distributed across types
    const documentType = index % 4;

    switch (documentType) {
      case 0:
        documents.push(generateMedicalHistoryForm(patient, index));
        break;
      case 1:
        documents.push(generateLabResult(patient, index));
        break;
      case 2:
        documents.push(generatePrescription(patient, index));
        break;
      case 3:
        documents.push(generateConsultationNote(patient, index));
        break;
    }
  });

  return documents;
}

/**
 * Get document statistics
 */
export function getDemoDocumentStats(documents: DemoDocument[]) {
  return {
    total: documents.length,
    byType: {
      medical_history: documents.filter(d => d.type === 'medical_history').length,
      lab_result: documents.filter(d => d.type === 'lab_result').length,
      prescription: documents.filter(d => d.type === 'prescription').length,
      consultation_note: documents.filter(d => d.type === 'consultation_note').length,
    },
    totalSize: documents.reduce((sum, d) => sum + d.metadata.fileSize, 0),
    withPHI: documents.filter(d => d.metadata.containsPHI).length,
  };
}
