/**
 * Laudo Médico Generator
 *
 * Produces a structured medical report from an Encounter and Patient.
 * Outputs a typed LaudoMedico object — does NOT render to PDF/DOCX.
 *
 * ELENA: sourceAuthority tracked via encounter metadata
 * RUTH: ANVISA SaMD Class I — informational report generation only
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalPatient } from './types';
import type { Encounter } from './encounter-types';

export interface LaudoMedicoSection {
  title: string;
  titlePt: string;
  content: string | null;
  subsections?: LaudoMedicoSection[];
}

export interface LaudoMedico {
  id: string;
  encounterId: string;
  patientId: string;
  tenantId: string;
  generatedAt: string;
  practitionerName: string;
  encounterType: 'anamnese_inicial' | 'evolucao';
  sections: LaudoMedicoSection[];
  metadata: {
    totalSections: number;
    completedSections: number;
    completenessScore: number;
  };
}

export function generateLaudoMedico(
  encounter: Encounter,
  patient: CanonicalPatient,
): LaudoMedico {
  const sections: LaudoMedicoSection[] = [
    buildPatientIdentification(patient),
    buildEncounterContext(encounter),
    buildChiefComplaints(encounter),
    buildMedicalHistory(encounter),
    buildFamilyHistory(encounter),
    buildNarrative(encounter),
    buildSystemsReview(encounter),
    buildPhysicalExam(encounter),
    buildVitalSigns(encounter),
    buildAssessmentAndPlan(encounter),
    buildPreventionAlerts(encounter),
  ];

  const totalSections = sections.length;
  const completedSections = sections.filter(s => s.content !== null || (s.subsections && s.subsections.length > 0)).length;

  return {
    id: uuidv4(),
    encounterId: encounter.id,
    patientId: encounter.patientId,
    tenantId: encounter.tenantId,
    generatedAt: new Date().toISOString(),
    practitionerName: encounter.practitionerName,
    encounterType: encounter.type,
    sections,
    metadata: {
      totalSections,
      completedSections,
      completenessScore: totalSections > 0 ? completedSections / totalSections : 0,
    },
  };
}

function buildPatientIdentification(patient: CanonicalPatient): LaudoMedicoSection {
  const parts: string[] = [
    `Nome: ${patient.firstName} ${patient.lastName}`,
    `Data de Nascimento: ${patient.dateOfBirth}`,
    `Sexo: ${patient.gender}`,
  ];
  if (patient.tipoSanguineo) parts.push(`Tipo Sanguíneo: ${patient.tipoSanguineo}`);
  if (patient.ocupacao) parts.push(`Ocupação: ${patient.ocupacao}`);
  if (patient.localNascimento) parts.push(`Local de Nascimento: ${patient.localNascimento}`);

  return {
    title: 'Patient Identification',
    titlePt: 'Identificação do Paciente',
    content: parts.join('\n'),
  };
}

function buildEncounterContext(encounter: Encounter): LaudoMedicoSection {
  const parts: string[] = [
    `Data: ${encounter.startedAt}`,
    `Tipo: ${encounter.type === 'anamnese_inicial' ? 'Anamnese Inicial' : 'Evolução'}`,
    `Médico: ${encounter.practitionerName}`,
  ];
  if (encounter.facilityId) parts.push(`Unidade: ${encounter.facilityId}`);

  return {
    title: 'Encounter Context',
    titlePt: 'Contexto da Consulta',
    content: parts.join('\n'),
  };
}

function buildChiefComplaints(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.chiefComplaints.length) {
    return { title: 'Chief Complaint(s)', titlePt: 'Queixa(s) Principal(is)', content: null };
  }

  const subsections: LaudoMedicoSection[] = encounter.chiefComplaints.map((cc, i) => {
    const parts: string[] = [
      `${cc.description} (CID-10: ${cc.icdCode} — ${cc.icdDisplay})`,
    ];
    if (cc.duration) parts.push(`Duração: ${cc.duration}`);
    if (cc.onsetDate) parts.push(`Início: ${cc.onsetDate}`);
    if (cc.aggravatingFactors?.length) parts.push(`Fatores agravantes: ${cc.aggravatingFactors.join(', ')}`);
    if (cc.relievingFactors?.length) parts.push(`Fatores de alívio: ${cc.relievingFactors.join(', ')}`);
    if (cc.chronologyNotes) parts.push(`Cronologia: ${cc.chronologyNotes}`);

    return {
      title: `Complaint ${i + 1}${cc.isPrimary ? ' (Primary)' : ''}`,
      titlePt: `Queixa ${i + 1}${cc.isPrimary ? ' (Principal)' : ''}`,
      content: parts.join('\n'),
    };
  });

  return {
    title: 'Chief Complaint(s)',
    titlePt: 'Queixa(s) Principal(is)',
    content: `${encounter.chiefComplaints.length} queixa(s) registrada(s)`,
    subsections,
  };
}

function buildMedicalHistory(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.comorbidities?.length) {
    return { title: 'Medical History', titlePt: 'Histórico Médico', content: null };
  }

  const lines = encounter.comorbidities.map(
    c => `${c.display} (CID-10: ${c.icdCode}) — ${c.clinicalStatus}`
  );

  return {
    title: 'Medical History',
    titlePt: 'Histórico Médico',
    content: lines.join('\n'),
  };
}

function buildFamilyHistory(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.familyHistory?.length) {
    return { title: 'Family History', titlePt: 'História Familiar', content: null };
  }

  const lines = encounter.familyHistory.map(fh => {
    const conditions = fh.conditions.map(c => `${c.display} (${c.icdCode})`).join(', ');
    return `${fh.relationship}: ${conditions}`;
  });

  return {
    title: 'Family History',
    titlePt: 'História Familiar',
    content: lines.join('\n'),
  };
}

function buildNarrative(encounter: Encounter): LaudoMedicoSection {
  if (encounter.type === 'anamnese_inicial') {
    return {
      title: 'Anamnesis',
      titlePt: 'Anamnese',
      content: encounter.anamnese ?? null,
    };
  }

  if (!encounter.evolucao) {
    return { title: 'Evolution', titlePt: 'Evolução', content: null };
  }

  const parts: string[] = [encounter.evolucao.progressSummary];
  if (encounter.evolucao.improvementAreas?.length) {
    parts.push(`Melhoras: ${encounter.evolucao.improvementAreas.join(', ')}`);
  }
  if (encounter.evolucao.worseningAreas?.length) {
    parts.push(`Pioras: ${encounter.evolucao.worseningAreas.join(', ')}`);
  }

  return {
    title: 'Evolution',
    titlePt: 'Evolução',
    content: parts.join('\n'),
  };
}

function buildSystemsReview(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.systemsReview) {
    return { title: 'Systems Review', titlePt: 'Revisão de Sistemas', content: null };
  }

  const positive = encounter.systemsReview.systems.filter(s => s.reviewed && !s.normal);
  const normalSystems = encounter.systemsReview.systems.filter(s => s.reviewed && s.normal);

  const parts: string[] = [];
  if (positive.length) {
    parts.push('Achados positivos:');
    for (const s of positive) {
      parts.push(`  ${s.system}: ${s.findings ?? 'Alterado'}`);
    }
  }
  if (normalSystems.length) {
    parts.push(`Sistemas normais: ${normalSystems.map(s => s.system).join(', ')}`);
  }

  return {
    title: 'Systems Review',
    titlePt: 'Revisão de Sistemas',
    content: parts.length ? parts.join('\n') : null,
  };
}

function buildPhysicalExam(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.physicalExam) {
    return { title: 'Physical Exam', titlePt: 'Exame Físico', content: null };
  }

  const parts: string[] = [];
  if (encounter.physicalExam.findings) {
    parts.push(encounter.physicalExam.findings);
  }
  if (encounter.physicalExam.attachments?.length) {
    parts.push(`Anexos: ${encounter.physicalExam.attachments.length} arquivo(s)`);
    for (const att of encounter.physicalExam.attachments) {
      parts.push(`  - ${att.filename} (${att.type})`);
    }
  }

  return {
    title: 'Physical Exam',
    titlePt: 'Exame Físico',
    content: parts.length ? parts.join('\n') : null,
  };
}

function buildVitalSigns(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.vitals) {
    return { title: 'Vital Signs', titlePt: 'Sinais Vitais', content: null };
  }

  const v = encounter.vitals;
  const parts: string[] = [];
  if (v.peso != null) parts.push(`Peso: ${v.peso} kg`);
  if (v.altura != null) parts.push(`Altura: ${v.altura} cm`);
  if (v.bmi != null) parts.push(`IMC: ${v.bmi}`);
  if (v.bloodPressureSystolic != null && v.bloodPressureDiastolic != null) {
    parts.push(`PA: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg`);
  }
  if (v.heartRate != null) parts.push(`FC: ${v.heartRate} bpm`);
  if (v.temperature != null) parts.push(`Temp: ${v.temperature} °C`);
  if (v.spO2 != null) parts.push(`SpO2: ${v.spO2}%`);

  return {
    title: 'Vital Signs',
    titlePt: 'Sinais Vitais',
    content: parts.length ? parts.join('\n') : null,
  };
}

function buildAssessmentAndPlan(encounter: Encounter): LaudoMedicoSection {
  const parts: string[] = [];
  if (encounter.assessment) parts.push(`Avaliação: ${encounter.assessment}`);
  if (encounter.plan) parts.push(`Plano: ${encounter.plan}`);

  return {
    title: 'Assessment & Plan',
    titlePt: 'Avaliação e Plano',
    content: parts.length ? parts.join('\n') : null,
  };
}

function buildPreventionAlerts(encounter: Encounter): LaudoMedicoSection {
  if (!encounter.preventionAlerts?.length) {
    return { title: 'Prevention Alerts', titlePt: 'Alertas de Prevenção', content: null };
  }

  return {
    title: 'Prevention Alerts',
    titlePt: 'Alertas de Prevenção',
    content: `${encounter.preventionAlerts.length} alerta(s) ativo(s): ${encounter.preventionAlerts.join(', ')}`,
  };
}
