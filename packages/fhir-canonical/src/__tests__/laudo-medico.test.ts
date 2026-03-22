import { v4 as uuidv4 } from 'uuid';
import { generateLaudoMedico } from '../laudo-medico';
import type { CanonicalPatient } from '../types';
import type { Encounter } from '../encounter-types';

const now = new Date().toISOString();
const id = () => uuidv4();

const encounterId = id();
const patientId = id();
const practitionerId = id();

const patient: CanonicalPatient = {
  id: patientId,
  firstName: 'Maria',
  lastName: 'Silva',
  dateOfBirth: '1985-03-15T00:00:00Z',
  gender: 'female',
  tipoSanguineo: 'O+',
  ocupacao: 'Engenheira',
  localNascimento: 'São Paulo, SP, Brasil',
  sourceAuthority: 'RNDS',
  importedAt: now,
  humanReviewRequired: true,
};

function buildEncounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: encounterId,
    patientId,
    tenantId: 'tenant-001',
    type: 'anamnese_inicial',
    startedAt: now,
    chiefComplaints: [
      {
        id: id(),
        encounterId,
        patientId,
        description: 'Dor abdominal recorrente',
        icdCode: 'R10.4',
        icdDisplay: 'Other abdominal pain',
        isPrimary: true,
        duration: '3 meses',
        aggravatingFactors: ['Alimentação gordurosa'],
        relievingFactors: ['Repouso'],
        sourceAuthority: 'Clinician',
        humanReviewRequired: true,
      },
    ],
    comorbidities: [
      {
        conditionId: id(),
        icdCode: 'E11',
        display: 'Type 2 diabetes mellitus',
        clinicalStatus: 'active',
      },
    ],
    familyHistory: [
      {
        id: id(),
        patientId,
        relationship: 'father',
        conditions: [{ icdCode: 'I10', display: 'Essential hypertension' }],
        sourceAuthority: 'Patient reported',
        humanReviewRequired: true,
      },
    ],
    vitals: {
      peso: 72.5,
      altura: 175,
      bmi: 23.7,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      temperature: 36.8,
      spO2: 98,
    },
    anamnese: 'Paciente refere dor abdominal há 3 meses, piora após alimentação.',
    assessment: 'Dispepsia funcional',
    plan: 'Dieta leve, IBP por 4 semanas, retorno em 30 dias.',
    preventionAlerts: [id()],
    practitionerId,
    practitionerName: 'Dr. Santos',
    sourceAuthority: 'Clinical system',
    humanReviewRequired: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Encounter;
}

describe('generateLaudoMedico', () => {
  it('generates a laudo for anamnese_inicial with all 11 sections', () => {
    const encounter = buildEncounter();
    const laudo = generateLaudoMedico(encounter, patient);

    expect(laudo.encounterId).toBe(encounterId);
    expect(laudo.patientId).toBe(patientId);
    expect(laudo.tenantId).toBe('tenant-001');
    expect(laudo.encounterType).toBe('anamnese_inicial');
    expect(laudo.practitionerName).toBe('Dr. Santos');
    expect(laudo.sections).toHaveLength(11);
    expect(laudo.id).toBeTruthy();
    expect(laudo.generatedAt).toBeTruthy();
  });

  it('includes patient demographics in section 1', () => {
    const encounter = buildEncounter();
    const laudo = generateLaudoMedico(encounter, patient);

    const patientSection = laudo.sections[0];
    expect(patientSection.titlePt).toBe('Identificação do Paciente');
    expect(patientSection.content).toContain('Maria Silva');
    expect(patientSection.content).toContain('O+');
    expect(patientSection.content).toContain('Engenheira');
  });

  it('includes chief complaints with ICD-10 codes', () => {
    const encounter = buildEncounter();
    const laudo = generateLaudoMedico(encounter, patient);

    const complaintsSection = laudo.sections[2];
    expect(complaintsSection.titlePt).toBe('Queixa(s) Principal(is)');
    expect(complaintsSection.subsections).toHaveLength(1);
    expect(complaintsSection.subsections![0].content).toContain('R10.4');
    expect(complaintsSection.subsections![0].content).toContain('3 meses');
  });

  it('includes vital signs with correct formatting', () => {
    const encounter = buildEncounter();
    const laudo = generateLaudoMedico(encounter, patient);

    const vitalsSection = laudo.sections[8];
    expect(vitalsSection.titlePt).toBe('Sinais Vitais');
    expect(vitalsSection.content).toContain('72.5 kg');
    expect(vitalsSection.content).toContain('120/80 mmHg');
    expect(vitalsSection.content).toContain('IMC: 23.7');
  });

  it('calculates completeness score correctly', () => {
    const encounter = buildEncounter();
    const laudo = generateLaudoMedico(encounter, patient);

    expect(laudo.metadata.totalSections).toBe(11);
    expect(laudo.metadata.completedSections).toBeGreaterThan(0);
    expect(laudo.metadata.completenessScore).toBeGreaterThan(0);
    expect(laudo.metadata.completenessScore).toBeLessThanOrEqual(1);
  });

  it('generates laudo for evolucao encounter', () => {
    const encounter = buildEncounter({
      type: 'evolucao',
      anamnese: undefined,
      evolucao: {
        previousEncounterId: id(),
        progressSummary: 'Paciente melhorou significativamente.',
        improvementAreas: ['Dor abdominal reduzida'],
        worseningAreas: [],
      },
    });

    const laudo = generateLaudoMedico(encounter, patient);
    expect(laudo.encounterType).toBe('evolucao');

    const narrativeSection = laudo.sections[5];
    expect(narrativeSection.titlePt).toBe('Evolução');
    expect(narrativeSection.content).toContain('melhorou significativamente');
  });

  it('handles empty sections gracefully with null content', () => {
    const encounter = buildEncounter({
      comorbidities: [],
      familyHistory: [],
      systemsReview: undefined,
      physicalExam: undefined,
      vitals: undefined,
      assessment: undefined,
      plan: undefined,
      preventionAlerts: [],
    });

    const laudo = generateLaudoMedico(encounter, patient);
    const nullSections = laudo.sections.filter(s => s.content === null);
    expect(nullSections.length).toBeGreaterThan(0);
    expect(laudo.metadata.completedSections).toBeLessThan(laudo.metadata.totalSections);
  });

  it('includes family history in section 5', () => {
    const encounter = buildEncounter();
    const laudo = generateLaudoMedico(encounter, patient);

    const familySection = laudo.sections[4];
    expect(familySection.titlePt).toBe('História Familiar');
    expect(familySection.content).toContain('father');
    expect(familySection.content).toContain('I10');
  });
});
