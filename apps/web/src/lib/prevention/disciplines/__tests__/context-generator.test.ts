import { generateDisciplineContext } from '../context-generator';
import type { DisciplineConfig, PatientDisciplineInput } from '../types';
import type { ScreeningRule } from '../../screening-triggers';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const testConfig: DisciplineConfig = {
  discipline: 'CARDIOLOGY',
  displayName: 'Cardiology',
  description: 'Test cardiology config',
  jurisdictions: ['BR'],
  screeningRuleIds: ['BP Screening BR', 'Lipid Screening BR'],
  screeningFilters: { ageRange: [18, 99] },
  riskWeights: {
    hypertension: {
      weight: 0.3,
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    smoking: {
      weight: 0.2,
      sourceAuthority: 'ESC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  },
  interventionPriority: [
    {
      code: 'STATIN',
      description: 'Statin therapy',
      urgency: 'ROUTINE',
      sourceAuthority: 'AHA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'ANTIHYPERTENSIVE',
      description: 'Antihypertensive initiation',
      urgency: 'URGENT',
      sourceAuthority: 'SBC 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
    {
      code: 'LIFESTYLE',
      description: 'Lifestyle modification',
      urgency: 'PREVENTIVE',
      sourceAuthority: 'AHA 2024',
      evidenceTier: 'TIER_1_GUIDELINE',
    },
  ],
  monitoringSchedule: [
    {
      biomarkerCode: 'LIPID_PANEL',
      intervalDays: 180,
      sourceAuthority: 'SBC 2024',
    },
    {
      biomarkerCode: 'HBA1C',
      intervalDays: 90,
      conditionTrigger: 'E11',
      sourceAuthority: 'AHA 2024',
    },
  ],
  referralTriggers: [
    {
      condition: { '>': [{ var: 'age' }, 65] },
      urgency: 'ROUTINE',
      description: 'Age-based referral for patients over 65',
      sourceAuthority: 'SBC 2024',
    },
    {
      condition: {
        or: [
          { '>=': [{ var: 'systolic_bp' }, 180] },
          { '>=': [{ var: 'diastolic_bp' }, 120] },
        ],
      },
      urgency: 'EMERGENT',
      description: 'Hypertensive crisis',
      sourceAuthority: 'SBC 2024',
    },
  ],
};

const testScreeningRules: ScreeningRule[] = [
  {
    name: 'BP Screening BR',
    screeningType: 'BLOOD_PRESSURE',
    uspstfGrade: 'A',
    ageRange: { min: 18 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation: 'Annual BP screening',
    guidelineSource: 'SBC 2024',
    jurisdiction: 'BR',
    sourceAuthority: 'SBC',
  },
  {
    name: 'Lipid Screening BR',
    screeningType: 'CHOLESTEROL',
    uspstfGrade: 'B',
    ageRange: { min: 40, max: 75 },
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation: 'Lipid panel every 5 years',
    guidelineSource: 'SBC 2024',
    jurisdiction: 'BR',
    sourceAuthority: 'SBC',
  },
  {
    name: 'Unrelated Rule',
    screeningType: 'OTHER',
    uspstfGrade: 'B',
    ageRange: { min: 18 },
    frequency: { years: 1 },
    priority: 'MEDIUM',
    clinicalRecommendation: 'Not in config',
    guidelineSource: 'WHO',
    jurisdiction: 'BR',
    sourceAuthority: 'WHO',
  },
];

function makePatientInput(overrides: Partial<PatientDisciplineInput> = {}): PatientDisciplineInput {
  return {
    patientId: 'patient-001',
    age: 55,
    biologicalSex: 'MALE',
    icd10Codes: [],
    activeMedications: [],
    lastScreenings: {},
    labResults: {},
    riskFactors: [],
    jurisdiction: 'BR',
    ...overrides,
  };
}

describe('generateDisciplineContext', () => {
  it('returns correct discipline in output', () => {
    const result = generateDisciplineContext(
      makePatientInput(),
      testConfig,
      testScreeningRules,
    );
    expect(result.discipline).toBe('CARDIOLOGY');
  });

  it('filters screening rules by config.screeningRuleIds', () => {
    const result = generateDisciplineContext(
      makePatientInput(),
      testConfig,
      testScreeningRules,
    );
    const ruleNames = result.applicableScreenings.map((s) => s.ruleName);
    expect(ruleNames).toContain('BP Screening BR');
    expect(ruleNames).not.toContain('Unrelated Rule');
  });

  it('marks screening as overdue when past due date', () => {
    const sixMonthsAgo = new Date(Date.now() - 400 * MS_PER_DAY);
    const result = generateDisciplineContext(
      makePatientInput({
        lastScreenings: { BLOOD_PRESSURE: sixMonthsAgo },
      }),
      testConfig,
      testScreeningRules,
    );
    const bpScreening = result.applicableScreenings.find(
      (s) => s.screeningType === 'BLOOD_PRESSURE',
    );
    expect(bpScreening).toBeDefined();
    expect(bpScreening!.overdue).toBe(true);
  });

  it('marks screening as not overdue when within interval', () => {
    const recentDate = new Date(Date.now() - 30 * MS_PER_DAY);
    const result = generateDisciplineContext(
      makePatientInput({
        lastScreenings: { BLOOD_PRESSURE: recentDate },
      }),
      testConfig,
      testScreeningRules,
    );
    const bpScreening = result.applicableScreenings.find(
      (s) => s.screeningType === 'BLOOD_PRESSURE',
    );
    expect(bpScreening).toBeDefined();
    expect(bpScreening!.overdue).toBe(false);
  });

  it('evaluates risk weights — present factor returns present=true', () => {
    const result = generateDisciplineContext(
      makePatientInput({ riskFactors: ['hypertension'] }),
      testConfig,
      testScreeningRules,
    );
    const htWeight = result.riskAssessment.find((r) => r.factor === 'hypertension');
    expect(htWeight).toBeDefined();
    expect(htWeight!.present).toBe(true);
    expect(htWeight!.weight).toBe(0.3);
  });

  it('evaluates risk weights — absent factor returns present=false', () => {
    const result = generateDisciplineContext(
      makePatientInput({ riskFactors: [] }),
      testConfig,
      testScreeningRules,
    );
    const smokingWeight = result.riskAssessment.find((r) => r.factor === 'smoking');
    expect(smokingWeight).toBeDefined();
    expect(smokingWeight!.present).toBe(false);
  });

  it('sorts interventions by urgency (EMERGENT < URGENT < ROUTINE < PREVENTIVE)', () => {
    const result = generateDisciplineContext(
      makePatientInput(),
      testConfig,
      testScreeningRules,
    );
    const urgencies = result.prioritizedInterventions.map((i) => i.urgency);
    const urgencyOrder: Record<string, number> = {
      EMERGENT: 0,
      URGENT: 1,
      ROUTINE: 2,
      PREVENTIVE: 3,
    };
    for (let i = 1; i < urgencies.length; i++) {
      expect(urgencyOrder[urgencies[i]]).toBeGreaterThanOrEqual(
        urgencyOrder[urgencies[i - 1]],
      );
    }
  });

  it('calculates monitoring due dates from last lab result', () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * MS_PER_DAY);
    const result = generateDisciplineContext(
      makePatientInput({
        labResults: { LIPID_PANEL: { value: 200, date: ninetyDaysAgo } },
      }),
      testConfig,
      testScreeningRules,
    );
    const lipidMonitor = result.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'LIPID_PANEL',
    );
    expect(lipidMonitor).toBeDefined();
    const expectedDue = new Date(ninetyDaysAgo.getTime() + 180 * MS_PER_DAY);
    expect(lipidMonitor!.nextDueDate.getTime()).toBe(expectedDue.getTime());
  });

  it('marks monitoring as overdue when past due', () => {
    const twoHundredDaysAgo = new Date(Date.now() - 200 * MS_PER_DAY);
    const result = generateDisciplineContext(
      makePatientInput({
        labResults: { LIPID_PANEL: { value: 200, date: twoHundredDaysAgo } },
      }),
      testConfig,
      testScreeningRules,
    );
    const lipidMonitor = result.monitoringSchedule.find(
      (m) => m.biomarkerCode === 'LIPID_PANEL',
    );
    expect(lipidMonitor).toBeDefined();
    expect(lipidMonitor!.overdue).toBe(true);
  });

  it('evaluates JSON-Logic referral triggers — true condition', () => {
    const result = generateDisciplineContext(
      makePatientInput({ age: 70 }),
      testConfig,
      testScreeningRules,
    );
    const ageTrigger = result.referralRecommendations.find(
      (r) => r.description === 'Age-based referral for patients over 65',
    );
    expect(ageTrigger).toBeDefined();
    expect(ageTrigger!.triggered).toBe(true);
  });

  it('evaluates JSON-Logic referral triggers — false condition', () => {
    const result = generateDisciplineContext(
      makePatientInput({ age: 40 }),
      testConfig,
      testScreeningRules,
    );
    const ageTrigger = result.referralRecommendations.find(
      (r) => r.description === 'Age-based referral for patients over 65',
    );
    expect(ageTrigger).toBeDefined();
    expect(ageTrigger!.triggered).toBe(false);
  });

  it('filters screenings by patient age (too young)', () => {
    const result = generateDisciplineContext(
      makePatientInput({ age: 30 }),
      testConfig,
      testScreeningRules,
    );
    const lipidScreening = result.applicableScreenings.find(
      (s) => s.screeningType === 'CHOLESTEROL',
    );
    expect(lipidScreening).toBeUndefined();
  });

  it('filters screenings by gender restriction', () => {
    const femaleConfig: DisciplineConfig = {
      ...testConfig,
      screeningRuleIds: ['Female Only Rule'],
      screeningFilters: { biologicalSex: ['FEMALE'] },
    };
    const femaleRule: ScreeningRule = {
      name: 'Female Only Rule',
      screeningType: 'CERVICAL',
      uspstfGrade: 'A',
      ageRange: { min: 21, max: 65 },
      genderRestriction: 'female',
      frequency: { years: 3 },
      priority: 'HIGH',
      clinicalRecommendation: 'Cervical screening',
      guidelineSource: 'INCA',
      jurisdiction: 'BR',
    };
    const result = generateDisciplineContext(
      makePatientInput({ biologicalSex: 'MALE', age: 30 }),
      femaleConfig,
      [femaleRule],
    );
    expect(result.applicableScreenings).toHaveLength(0);
  });

  it('filters screenings by jurisdiction', () => {
    const coRule: ScreeningRule = {
      name: 'BP Screening BR',
      screeningType: 'BLOOD_PRESSURE',
      uspstfGrade: 'A',
      ageRange: { min: 18 },
      frequency: { years: 1 },
      priority: 'HIGH',
      clinicalRecommendation: 'Annual BP screening',
      guidelineSource: 'Colombia Protocol',
      jurisdiction: 'CO',
      sourceAuthority: 'MinSalud',
    };
    const result = generateDisciplineContext(
      makePatientInput({ jurisdiction: 'BR' }),
      testConfig,
      [coRule],
    );
    const bpScreening = result.applicableScreenings.find(
      (s) => s.screeningType === 'BLOOD_PRESSURE',
    );
    expect(bpScreening).toBeUndefined();
  });

  it('returns empty arrays when no rules match', () => {
    const emptyConfig: DisciplineConfig = {
      ...testConfig,
      screeningRuleIds: [],
      riskWeights: {},
      interventionPriority: [],
      monitoringSchedule: [],
      referralTriggers: [],
    };
    const result = generateDisciplineContext(
      makePatientInput(),
      emptyConfig,
      testScreeningRules,
    );
    expect(result.applicableScreenings).toHaveLength(0);
    expect(result.riskAssessment).toHaveLength(0);
    expect(result.prioritizedInterventions).toHaveLength(0);
    expect(result.monitoringSchedule).toHaveLength(0);
    expect(result.referralRecommendations).toHaveLength(0);
  });
});
