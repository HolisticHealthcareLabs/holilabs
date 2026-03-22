import { v4 as uuidv4 } from 'uuid';
import {
  EncounterSchema,
  ChiefComplaintSchema,
  FamilyMemberHistorySchema,
  SystemsReviewSchema,
  EncounterVitalsSchema,
} from '../encounter-types';

const now = new Date().toISOString();
const id = () => uuidv4();

const baseComplaint = {
  id: id(),
  encounterId: id(),
  patientId: id(),
  description: 'Dor abdominal recorrente',
  icdCode: 'R10.4',
  icdDisplay: 'Other and unspecified abdominal pain',
  isPrimary: true,
  sourceAuthority: 'Clinician direct entry',
  humanReviewRequired: true,
};

const baseFamilyHistory = {
  id: id(),
  patientId: id(),
  relationship: 'father' as const,
  conditions: [
    { icdCode: 'E11', display: 'Type 2 diabetes mellitus', ageAtDiagnosis: 55 },
  ],
  sourceAuthority: 'Patient reported',
  humanReviewRequired: true,
};

const encounterId = id();
const patientId = id();
const practitionerId = id();

function buildEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: encounterId,
    patientId,
    tenantId: 'tenant-001',
    type: 'anamnese_inicial',
    startedAt: now,
    chiefComplaints: [{ ...baseComplaint, encounterId, patientId }],
    comorbidities: [],
    familyHistory: [],
    practitionerId,
    practitionerName: 'Dr. Silva',
    sourceAuthority: 'Clinical system',
    humanReviewRequired: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Encounter Schemas', () => {
  describe('EncounterSchema — anamnese_inicial', () => {
    it('accepts a valid anamnese_inicial encounter with complaints, vitals, and systems review', () => {
      const systemsReview = {
        id: id(),
        encounterId,
        patientId,
        systems: [
          { system: 'cardiovascular' as const, reviewed: true, normal: true },
          { system: 'gastrointestinal' as const, reviewed: true, normal: false, findings: 'Tenderness in RLQ' },
          { system: 'neurological' as const, reviewed: true, normal: true },
        ],
        unreviewedConfirmed: true,
        sourceAuthority: 'Clinician direct entry',
        humanReviewRequired: true,
      };

      const vitals = {
        peso: 72.5,
        altura: 175,
        bmi: 23.7,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        temperature: 36.8,
        spO2: 98,
      };

      const encounter = buildEncounter({
        systemsReview,
        vitals,
        anamnese: 'Patient reports recurring abdominal pain for 3 months.',
      });

      const result = EncounterSchema.parse(encounter);
      expect(result.type).toBe('anamnese_inicial');
      expect(result.chiefComplaints).toHaveLength(1);
      expect(result.vitals?.bmi).toBe(23.7);
      expect(result.systemsReview?.systems).toHaveLength(3);
    });
  });

  describe('EncounterSchema — evolucao', () => {
    it('accepts a valid evolucao encounter with previousEncounterId and progressSummary', () => {
      const previousEncounterId = id();
      const encounter = buildEncounter({
        type: 'evolucao',
        evolucao: {
          previousEncounterId,
          progressSummary: 'Patient shows improvement in abdominal symptoms.',
          improvementAreas: ['Pain reduced from 8/10 to 3/10'],
          worseningAreas: [],
        },
      });

      const result = EncounterSchema.parse(encounter);
      expect(result.type).toBe('evolucao');
      expect(result.evolucao?.previousEncounterId).toBe(previousEncounterId);
      expect(result.evolucao?.progressSummary).toContain('improvement');
    });
  });

  describe('ChiefComplaintSchema', () => {
    it('rejects missing ICD-10 code', () => {
      const invalid = { ...baseComplaint, icdCode: undefined };
      expect(() => ChiefComplaintSchema.parse(invalid)).toThrow();
    });

    it('rejects invalid ICD-10 format', () => {
      const invalid = { ...baseComplaint, icdCode: '123' };
      expect(() => ChiefComplaintSchema.parse(invalid)).toThrow();
    });
  });

  describe('FamilyMemberHistorySchema', () => {
    it('accepts family history with conditions array', () => {
      const result = FamilyMemberHistorySchema.parse(baseFamilyHistory);
      expect(result.relationship).toBe('father');
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].icdCode).toBe('E11');
    });

    it('accepts family history with death info', () => {
      const withDeath = {
        ...baseFamilyHistory,
        isLiving: false,
        ageAtDeath: 72,
        causeOfDeath: 'Myocardial infarction',
        causeOfDeathIcd: 'I21',
      };
      const result = FamilyMemberHistorySchema.parse(withDeath);
      expect(result.isLiving).toBe(false);
      expect(result.causeOfDeathIcd).toBe('I21');
    });
  });

  describe('SystemsReviewSchema', () => {
    it('accepts systems review with unreviewedConfirmed=false when some systems not reviewed', () => {
      const review = {
        id: id(),
        encounterId: id(),
        patientId: id(),
        systems: [
          { system: 'cardiovascular' as const, reviewed: true, normal: true },
          { system: 'neurological' as const, reviewed: false, normal: true },
        ],
        unreviewedConfirmed: false,
        sourceAuthority: 'Clinician',
        humanReviewRequired: true,
      };
      const result = SystemsReviewSchema.parse(review);
      expect(result.unreviewedConfirmed).toBe(false);
      expect(result.systems[1].reviewed).toBe(false);
    });
  });

  describe('EncounterVitalsSchema', () => {
    it('accepts vitals with BMI', () => {
      const vitals = { peso: 70, altura: 175, bmi: 22.9 };
      const result = EncounterVitalsSchema.parse(vitals);
      expect(result.bmi).toBe(22.9);
    });

    it('rejects negative weight', () => {
      expect(() => EncounterVitalsSchema.parse({ peso: -5 })).toThrow();
    });
  });

  describe('EncounterSchema — required field validation', () => {
    it('rejects missing tenantId', () => {
      const invalid = buildEncounter({ tenantId: undefined });
      expect(() => EncounterSchema.parse(invalid)).toThrow();
    });

    it('rejects missing type', () => {
      const invalid = buildEncounter({ type: undefined });
      expect(() => EncounterSchema.parse(invalid)).toThrow();
    });

    it('rejects missing practitionerId', () => {
      const invalid = buildEncounter({ practitionerId: undefined });
      expect(() => EncounterSchema.parse(invalid)).toThrow();
    });

    it('rejects missing sourceAuthority', () => {
      const invalid = buildEncounter({ sourceAuthority: '' });
      expect(() => EncounterSchema.parse(invalid)).toThrow();
    });

    it('rejects more than 4 chief complaints', () => {
      const complaints = Array.from({ length: 5 }, () => ({
        ...baseComplaint,
        id: id(),
        encounterId,
        patientId,
      }));
      const invalid = buildEncounter({ chiefComplaints: complaints });
      expect(() => EncounterSchema.parse(invalid)).toThrow();
    });
  });
});
