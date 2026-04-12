import {
  buildScreeningSection,
  buildRiskSection,
  buildInterventionSection,
  buildMonitoringSection,
  buildReferralSection,
  buildDisciplinePrompt,
  countTriggeredReferrals,
  countOverdueScreenings,
  getUrgentItems,
} from '../prompt-templates';
import type { PromptTemplateOptions } from '../prompt-templates';
import type {
  DisciplineContextOutput,
  ScreeningRecommendation,
  RiskAssessment,
  InterventionRecommendation,
  MonitoringDueItem,
  ReferralRecommendation,
} from '../disciplines/types';

const fixedDate = new Date('2026-03-15T12:00:00Z');

function makeContext(
  overrides: Partial<DisciplineContextOutput> = {},
): DisciplineContextOutput {
  return {
    discipline: 'CARDIOLOGY',
    patientId: 'pt-001',
    applicableScreenings: [],
    riskAssessment: [],
    prioritizedInterventions: [],
    monitoringSchedule: [],
    referralRecommendations: [],
    metadata: {
      generatedAt: fixedDate,
      jurisdiction: 'BR',
      configVersion: '1.0.0',
    },
    ...overrides,
  };
}

const defaultOpts: PromptTemplateOptions = {
  locale: 'en',
  includeOverdueOnly: false,
  maxScreenings: 20,
  maxInterventions: 10,
};

const sampleScreening: ScreeningRecommendation = {
  ruleName: 'BP Screening',
  screeningType: 'BLOOD_PRESSURE',
  dueDate: new Date('2026-01-01'),
  overdue: true,
  priority: 'HIGH',
  sourceAuthority: 'SBC 2024',
};

const sampleRisk: RiskAssessment = {
  factor: 'hypertension',
  weight: 0.3,
  present: true,
  sourceAuthority: 'SBC 2024',
  evidenceTier: 'TIER_1_GUIDELINE',
};

const sampleIntervention: InterventionRecommendation = {
  code: 'STATIN',
  description: 'High-intensity statin therapy',
  urgency: 'ROUTINE',
  applicable: true,
  sourceAuthority: 'AHA 2024',
};

const sampleMonitor: MonitoringDueItem = {
  biomarkerCode: 'LIPID_PANEL',
  nextDueDate: new Date('2026-01-01'),
  overdue: true,
  intervalDays: 180,
  sourceAuthority: 'SBC 2024',
};

const sampleReferral: ReferralRecommendation = {
  urgency: 'EMERGENT',
  description: 'Hypertensive crisis referral',
  triggered: true,
  sourceAuthority: 'SBC 2024',
};

describe('prompt-templates', () => {
  describe('buildScreeningSection', () => {
    it('returns empty string for no screenings', () => {
      expect(buildScreeningSection([], defaultOpts)).toBe('');
    });

    it('renders screening with OVERDUE tag when overdue', () => {
      const result = buildScreeningSection([sampleScreening], defaultOpts);
      expect(result).toContain('[OVERDUE]');
      expect(result).toContain('BP Screening');
      expect(result).toContain('SBC 2024');
    });

    it('respects includeOverdueOnly option', () => {
      const nonOverdue: ScreeningRecommendation = {
        ...sampleScreening,
        ruleName: 'Lipid Panel',
        overdue: false,
      };
      const opts = { ...defaultOpts, includeOverdueOnly: true };
      const result = buildScreeningSection(
        [sampleScreening, nonOverdue],
        opts,
      );
      expect(result).toContain('BP Screening');
      expect(result).not.toContain('Lipid Panel');
    });

    it('respects maxScreenings limit', () => {
      const many = Array.from({ length: 5 }, (_, i) => ({
        ...sampleScreening,
        ruleName: `Rule ${i}`,
      }));
      const opts = { ...defaultOpts, maxScreenings: 2 };
      const result = buildScreeningSection(many, opts);
      expect(result).toContain('Rule 0');
      expect(result).toContain('Rule 1');
      expect(result).not.toContain('Rule 2');
    });
  });

  describe('buildRiskSection', () => {
    it('returns empty string for empty risks', () => {
      expect(buildRiskSection([], defaultOpts)).toBe('');
    });

    it('renders present/absent status correctly', () => {
      const absentRisk: RiskAssessment = { ...sampleRisk, present: false, factor: 'smoking' };
      const result = buildRiskSection([sampleRisk, absentRisk], defaultOpts);
      expect(result).toContain('hypertension: weight=0.3, present');
      expect(result).toContain('smoking: weight=0.3, absent');
    });
  });

  describe('buildInterventionSection', () => {
    it('returns empty string for no interventions', () => {
      expect(buildInterventionSection([], defaultOpts)).toBe('');
    });

    it('includes urgency tag and source authority', () => {
      const result = buildInterventionSection([sampleIntervention], defaultOpts);
      expect(result).toContain('[ROUTINE]');
      expect(result).toContain('AHA 2024');
    });
  });

  describe('buildMonitoringSection', () => {
    it('returns empty string for empty schedule', () => {
      expect(buildMonitoringSection([], defaultOpts)).toBe('');
    });

    it('includes interval days and overdue tag', () => {
      const result = buildMonitoringSection([sampleMonitor], defaultOpts);
      expect(result).toContain('every 180d');
      expect(result).toContain('[OVERDUE]');
    });

    it('filters to overdue only when option set', () => {
      const notOverdue: MonitoringDueItem = {
        ...sampleMonitor,
        biomarkerCode: 'HBA1C',
        overdue: false,
      };
      const opts = { ...defaultOpts, includeOverdueOnly: true };
      const result = buildMonitoringSection([sampleMonitor, notOverdue], opts);
      expect(result).toContain('LIPID_PANEL');
      expect(result).not.toContain('HBA1C');
    });
  });

  describe('buildReferralSection', () => {
    it('returns empty string for no referrals', () => {
      expect(buildReferralSection([], defaultOpts)).toBe('');
    });

    it('includes TRIGGERED tag for triggered referrals', () => {
      const result = buildReferralSection([sampleReferral], defaultOpts);
      expect(result).toContain('[TRIGGERED]');
      expect(result).toContain('[EMERGENT]');
    });

    it('omits TRIGGERED tag for non-triggered referrals', () => {
      const notTriggered: ReferralRecommendation = {
        ...sampleReferral,
        triggered: false,
      };
      const result = buildReferralSection([notTriggered], defaultOpts);
      expect(result).not.toContain('[TRIGGERED]');
    });
  });

  describe('buildDisciplinePrompt', () => {
    it('includes discipline name and patient ID in header', () => {
      const ctx = makeContext();
      const result = buildDisciplinePrompt(ctx);
      expect(result).toContain('CARDIOLOGY');
      expect(result).toContain('pt-001');
    });

    it('includes jurisdiction in metadata line', () => {
      const ctx = makeContext();
      const result = buildDisciplinePrompt(ctx);
      expect(result).toContain('Jurisdiction: BR');
    });

    it('assembles all non-empty sections', () => {
      const ctx = makeContext({
        applicableScreenings: [sampleScreening],
        riskAssessment: [sampleRisk],
        prioritizedInterventions: [sampleIntervention],
        monitoringSchedule: [sampleMonitor],
        referralRecommendations: [sampleReferral],
      });
      const result = buildDisciplinePrompt(ctx);
      expect(result).toContain('## Applicable Screenings');
      expect(result).toContain('## Risk Assessment');
      expect(result).toContain('## Prioritized Interventions');
      expect(result).toContain('## Monitoring Schedule');
      expect(result).toContain('## Referral Recommendations');
    });

    it('renders in pt-BR locale', () => {
      const ctx = makeContext({
        applicableScreenings: [sampleScreening],
      });
      const result = buildDisciplinePrompt(ctx, { locale: 'pt-BR' });
      expect(result).toContain('Rastreamentos Aplicaveis');
      expect(result).toContain('[ATRASADO]');
    });

    it('renders in es locale', () => {
      const ctx = makeContext({
        applicableScreenings: [sampleScreening],
      });
      const result = buildDisciplinePrompt(ctx, { locale: 'es' });
      expect(result).toContain('Tamizajes Aplicables');
      expect(result).toContain('[VENCIDO]');
    });
  });

  describe('countTriggeredReferrals', () => {
    it('counts only triggered referrals', () => {
      const ctx = makeContext({
        referralRecommendations: [
          { ...sampleReferral, triggered: true },
          { ...sampleReferral, triggered: false },
          { ...sampleReferral, triggered: true },
        ],
      });
      expect(countTriggeredReferrals(ctx)).toBe(2);
    });

    it('returns 0 when no referrals triggered', () => {
      const ctx = makeContext({
        referralRecommendations: [{ ...sampleReferral, triggered: false }],
      });
      expect(countTriggeredReferrals(ctx)).toBe(0);
    });
  });

  describe('countOverdueScreenings', () => {
    it('counts only overdue screenings', () => {
      const ctx = makeContext({
        applicableScreenings: [
          { ...sampleScreening, overdue: true },
          { ...sampleScreening, overdue: false },
        ],
      });
      expect(countOverdueScreenings(ctx)).toBe(1);
    });
  });

  describe('getUrgentItems', () => {
    it('returns triggered EMERGENT referral descriptions', () => {
      const ctx = makeContext({
        referralRecommendations: [
          { ...sampleReferral, triggered: true, urgency: 'EMERGENT', description: 'Crisis A' },
        ],
      });
      expect(getUrgentItems(ctx)).toContain('Crisis A');
    });

    it('returns triggered URGENT referral descriptions', () => {
      const ctx = makeContext({
        referralRecommendations: [
          { ...sampleReferral, triggered: true, urgency: 'URGENT', description: 'Urgent B' },
        ],
      });
      expect(getUrgentItems(ctx)).toContain('Urgent B');
    });

    it('excludes non-triggered referrals', () => {
      const ctx = makeContext({
        referralRecommendations: [
          { ...sampleReferral, triggered: false, urgency: 'EMERGENT', description: 'Not active' },
        ],
      });
      expect(getUrgentItems(ctx)).not.toContain('Not active');
    });

    it('includes applicable EMERGENT interventions', () => {
      const ctx = makeContext({
        prioritizedInterventions: [
          { ...sampleIntervention, applicable: true, urgency: 'EMERGENT', description: 'Emergency intervention' },
        ],
      });
      expect(getUrgentItems(ctx)).toContain('Emergency intervention');
    });

    it('returns empty array when nothing is urgent', () => {
      const ctx = makeContext({
        referralRecommendations: [
          { ...sampleReferral, triggered: true, urgency: 'ROUTINE', description: 'Routine' },
        ],
        prioritizedInterventions: [
          { ...sampleIntervention, applicable: true, urgency: 'PREVENTIVE', description: 'Preventive' },
        ],
      });
      expect(getUrgentItems(ctx)).toHaveLength(0);
    });
  });
});
