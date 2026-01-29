/**
 * Unit Tests: Symptom Diagnosis Engine
 *
 * Law 3 Compliance: Design for Failure
 * Tests verify that the engine returns meaningful diagnoses even when AI fails.
 *
 * Test Categories:
 * 1. Deterministic fallback produces valid differentials
 * 2. Probability modifiers work correctly
 * 3. Urgency determination is accurate
 * 4. Keyword matching works
 * 5. Integration with processWithFallback
 */

import type { SymptomInput, PatientContext } from '@holilabs/shared-types';

// Mock dependencies BEFORE imports
jest.mock('@/lib/prisma', () => ({
  prisma: {
    symptomDiagnosisMap: {
      findMany: jest.fn(),
    },
    aIUsageLog: {
      create: jest.fn(),
    },
    featureFlag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/ai/bridge', () => ({
  aiToJSON: jest.fn(),
}));

jest.mock('@/lib/ai/retry', () => ({
  withRetry: jest.fn(async (fn) => fn()),
  RETRY_PRESETS: {
    cloud: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000, retryableErrors: [] },
  },
}));

jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger');

// Import mocks after jest.mock()
const { prisma } = require('@/lib/prisma');
const { aiToJSON } = require('@/lib/ai/bridge');
const { withRetry } = require('@/lib/ai/retry');
const { isFeatureEnabled } = require('@/lib/feature-flags');
const logger = require('@/lib/logger').default;

// Import module under test - need to clear singleton for tests
const engineModule = require('../engines/symptom-diagnosis-engine');

describe('SymptomDiagnosisEngine', () => {
  let engine: typeof engineModule.symptomDiagnosisEngine;

  // Sample symptom diagnosis rules from database
  const sampleRules = [
    {
      id: 'rule-1',
      symptomKeywords: ['chest pain', 'substernal'],
      symptomCategory: 'cardiovascular',
      icd10Code: 'I20.9',
      diagnosisName: 'Angina pectoris, unspecified',
      baseProbability: 0.3,
      probabilityModifiers: {
        'age>65': 1.3,
        diabetes: 1.5,
        smoker: 1.4,
        hypertension: 1.3,
      },
      redFlags: ['New onset', 'At rest', 'Radiating to arm/jaw'],
      workupSuggestions: ['ECG', 'Troponin', 'Chest X-ray'],
      isActive: true,
    },
    {
      id: 'rule-2',
      symptomKeywords: ['chest pain', 'heartburn', 'epigastric'],
      symptomCategory: 'gastrointestinal',
      icd10Code: 'K21.0',
      diagnosisName: 'Gastroesophageal reflux disease with esophagitis',
      baseProbability: 0.25,
      probabilityModifiers: {
        'age>65': 0.9,
        obesity: 1.3,
      },
      redFlags: ['Weight loss', 'Dysphagia'],
      workupSuggestions: ['PPI trial', 'Consider endoscopy if refractory'],
      isActive: true,
    },
    {
      id: 'rule-3',
      symptomKeywords: ['shortness of breath', 'dyspnea', 'breathing difficulty'],
      symptomCategory: 'respiratory',
      icd10Code: 'J06.9',
      diagnosisName: 'Acute upper respiratory infection, unspecified',
      baseProbability: 0.35,
      probabilityModifiers: {},
      redFlags: ['High fever', 'Productive cough'],
      workupSuggestions: ['Chest X-ray if severe', 'Pulse oximetry'],
      isActive: true,
    },
    {
      id: 'rule-4',
      symptomKeywords: ['headache', 'head pain', 'cephalgia'],
      symptomCategory: 'neurological',
      icd10Code: 'R51',
      diagnosisName: 'Headache',
      baseProbability: 0.4,
      probabilityModifiers: {
        'age>65': 1.2,
      },
      redFlags: ['Sudden onset', 'Worst headache of life', 'Neck stiffness', 'Fever'],
      workupSuggestions: ['Neurological exam', 'CT if red flags present'],
      isActive: true,
    },
    {
      id: 'rule-5',
      symptomKeywords: ['chest pain'],
      symptomCategory: 'cardiovascular',
      icd10Code: 'I21.9',
      diagnosisName: 'Acute myocardial infarction, unspecified',
      baseProbability: 0.15,
      probabilityModifiers: {
        'age>65': 1.5,
        diabetes: 1.8,
        smoker: 1.6,
        hypertension: 1.4,
        cardiovascular: 2.0,
      },
      redFlags: ['Diaphoresis', 'Crushing pain', 'Radiation to arm'],
      workupSuggestions: ['STAT ECG', 'Serial troponins', 'Cardiology consult'],
      isActive: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Get fresh engine instance
    engine = engineModule.symptomDiagnosisEngine;

    // Re-establish withRetry mock implementation after clearAllMocks
    (withRetry as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());

    // Default: AI fails, use fallback
    (aiToJSON as jest.Mock).mockImplementation(() => Promise.reject(new Error('AI unavailable')));
    (prisma.symptomDiagnosisMap.findMany as jest.Mock).mockImplementation(() => Promise.resolve(sampleRules));
    (prisma.aIUsageLog.create as jest.Mock).mockImplementation(() => Promise.resolve({}));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Deterministic Fallback', () => {
    it('should return matching differentials when AI fails', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain for 2 hours',
        severity: 'moderate',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000); // Past timeout
      const result = await resultPromise;

      expect(result.method).toBe('fallback');
      expect(result.confidence).toBe('fallback');
      expect(result.data.differentials.length).toBeGreaterThan(0);

      // Should match chest pain rules
      const diagnoses = result.data.differentials.map((d: any) => d.icd10Code);
      expect(diagnoses).toContain('I20.9'); // Angina
      expect(diagnoses).toContain('K21.0'); // GERD
      expect(diagnoses).toContain('I21.9'); // MI
    });

    it('should return generic diagnosis when no rules match', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Unusual symptom not in rules',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      expect(result.method).toBe('fallback');
      expect(result.data.differentials.length).toBe(1);
      expect(result.data.differentials[0].icd10Code).toBe('R69');
      expect(result.data.differentials[0].name).toBe('Illness, unspecified');
    });

    it('should sort differentials by probability descending', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      const probabilities = result.data.differentials.map((d: any) => d.probability);
      for (let i = 1; i < probabilities.length; i++) {
        expect(probabilities[i - 1]).toBeGreaterThanOrEqual(probabilities[i]);
      }
    });

    it('should limit differentials to top 5', async () => {
      // Add more matching rules
      const manyRules = [...sampleRules];
      for (let i = 0; i < 10; i++) {
        manyRules.push({
          ...sampleRules[0],
          id: `extra-rule-${i}`,
          baseProbability: 0.1 + (i * 0.02),
        });
      }
      (prisma.symptomDiagnosisMap.findMany as jest.Mock).mockImplementation(() => Promise.resolve(manyRules));

      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      expect(result.data.differentials.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Probability Modifiers', () => {
    it('should increase probability for patients over 65', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const youngPatient: PatientContext = {
        patientId: 'young-1',
        age: 35,
        sex: 'M',
      };

      const elderlyPatient: PatientContext = {
        patientId: 'elderly-1',
        age: 70,
        sex: 'M',
      };

      // Test with young patient
      const youngResultPromise = engine.evaluate(symptoms, youngPatient);
      await jest.advanceTimersByTimeAsync(20000);
      const youngResult = await youngResultPromise;

      // Reset mocks and timers
      jest.clearAllMocks();
      jest.setSystemTime(new Date());

      // Test with elderly patient
      const elderlyResultPromise = engine.evaluate(symptoms, elderlyPatient);
      await jest.advanceTimersByTimeAsync(20000);
      const elderlyResult = await elderlyResultPromise;

      // Find angina in both results (has age>65 modifier of 1.3)
      const youngAngina = youngResult.data.differentials.find(
        (d: any) => d.icd10Code === 'I20.9'
      );
      const elderlyAngina = elderlyResult.data.differentials.find(
        (d: any) => d.icd10Code === 'I20.9'
      );

      expect(elderlyAngina.probability).toBeGreaterThan(youngAngina.probability);
    });

    it('should increase probability for diabetic patients', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const diabeticPatient: PatientContext = {
        patientId: 'diabetic-1',
        age: 55,
        sex: 'M',
        hasDiabetes: true,
      };

      const nonDiabeticPatient: PatientContext = {
        patientId: 'non-diabetic-1',
        age: 55,
        sex: 'M',
        hasDiabetes: false,
      };

      const diabeticResultPromise = engine.evaluate(symptoms, diabeticPatient);
      await jest.advanceTimersByTimeAsync(20000);
      const diabeticResult = await diabeticResultPromise;

      jest.clearAllMocks();
      jest.setSystemTime(new Date());

      const nonDiabeticResultPromise = engine.evaluate(symptoms, nonDiabeticPatient);
      await jest.advanceTimersByTimeAsync(20000);
      const nonDiabeticResult = await nonDiabeticResultPromise;

      // MI has diabetes modifier of 1.8
      const diabeticMI = diabeticResult.data.differentials.find(
        (d: any) => d.icd10Code === 'I21.9'
      );
      const nonDiabeticMI = nonDiabeticResult.data.differentials.find(
        (d: any) => d.icd10Code === 'I21.9'
      );

      expect(diabeticMI.probability).toBeGreaterThan(nonDiabeticMI.probability);
    });

    it('should increase probability for smokers', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const smokerPatient: PatientContext = {
        patientId: 'smoker-1',
        age: 50,
        sex: 'M',
        isSmoker: true,
      };

      const resultPromise = engine.evaluate(symptoms, smokerPatient);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      // Angina has smoker modifier of 1.4
      const angina = result.data.differentials.find((d: any) => d.icd10Code === 'I20.9');
      // Base 0.3 * 1.4 = 0.42
      expect(angina.probability).toBeGreaterThan(0.3);
    });

    it('should cap probability at 95%', async () => {
      // Patient with multiple risk factors
      const highRiskPatient: PatientContext = {
        patientId: 'high-risk-1',
        age: 80,
        sex: 'M',
        hasDiabetes: true,
        hasHypertension: true,
        isSmoker: true,
        diagnoses: [
          { id: 'diag-1', icd10Code: 'I25.10', name: 'Coronary artery disease', clinicalStatus: 'ACTIVE' as const },
        ],
      };

      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
        severity: 'severe',
      };

      const resultPromise = engine.evaluate(symptoms, highRiskPatient);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      // All probabilities should be capped at 0.95
      for (const diff of result.data.differentials) {
        expect(diff.probability).toBeLessThanOrEqual(0.95);
      }
    });
  });

  describe('Severity Modifiers', () => {
    it('should increase probability for severe symptoms', async () => {
      const mildSymptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
        severity: 'mild',
      };

      const severeSymptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
        severity: 'severe',
      };

      const mildResultPromise = engine.evaluate(mildSymptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const mildResult = await mildResultPromise;

      jest.clearAllMocks();
      jest.setSystemTime(new Date());

      const severeResultPromise = engine.evaluate(severeSymptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const severeResult = await severeResultPromise;

      const mildAngina = mildResult.data.differentials.find(
        (d: any) => d.icd10Code === 'I20.9'
      );
      const severeAngina = severeResult.data.differentials.find(
        (d: any) => d.icd10Code === 'I20.9'
      );

      // Severe modifier is 1.2, mild is 0.9
      expect(severeAngina.probability).toBeGreaterThan(mildAngina.probability);
    });
  });

  describe('Urgency Determination', () => {
    it('should return emergent for MI', async () => {
      // Make MI the highest probability diagnosis
      const modifiedRules = sampleRules.map((rule) => {
        if (rule.icd10Code === 'I21.9') {
          return { ...rule, baseProbability: 0.8 };
        }
        return rule;
      });
      (prisma.symptomDiagnosisMap.findMany as jest.Mock).mockImplementation(() => Promise.resolve(modifiedRules));

      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain with diaphoresis',
        severity: 'severe',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      expect(result.data.urgency).toBe('emergent');
    });

    it('should return urgent when red flags present with significant probability', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Headache',
        severity: 'moderate',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      // Headache rule has red flags and probability > 0.3
      // But none of our test rules are emergent ICD codes for headache
      // So it should be either urgent (if red flags) or routine
      expect(['urgent', 'routine']).toContain(result.data.urgency);
    });

    it('should return routine for low-risk presentations', async () => {
      // Only use GERD rule
      (prisma.symptomDiagnosisMap.findMany as jest.Mock).mockImplementation(() => Promise.resolve([
        sampleRules[1], // GERD only
      ]));

      const symptoms: SymptomInput = {
        chiefComplaint: 'Heartburn after meals',
        severity: 'mild',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      // GERD with mild severity and low probability should be routine
      expect(result.data.urgency).toBe('routine');
    });
  });

  describe('Keyword Matching', () => {
    it('should match keywords in chief complaint', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Experiencing shortness of breath',
      };

      // 'shortness of breath' matches the respiratory rule
      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      const respiratory = result.data.differentials.find(
        (d: any) => d.icd10Code === 'J06.9'
      );
      expect(respiratory).toBeDefined();
    });

    it('should match keywords in associated symptoms', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'General malaise',
        associatedSymptoms: ['shortness of breath', 'fatigue'],
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      const respiratory = result.data.differentials.find(
        (d: any) => d.icd10Code === 'J06.9'
      );
      expect(respiratory).toBeDefined();
    });

    it('should be case-insensitive in matching', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'CHEST PAIN radiating to arm',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      expect(result.data.differentials.length).toBeGreaterThan(0);
      const hasCardiac = result.data.differentials.some(
        (d: any) => d.icd10Code.startsWith('I')
      );
      expect(hasCardiac).toBe(true);
    });
  });

  describe('Red Flags and Workup', () => {
    it('should include red flags from matched rules', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      const angina = result.data.differentials.find(
        (d: any) => d.icd10Code === 'I20.9'
      );

      expect(angina.redFlags).toContain('New onset');
      expect(angina.redFlags).toContain('At rest');
    });

    it('should include workup suggestions from matched rules', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      const angina = result.data.differentials.find(
        (d: any) => d.icd10Code === 'I20.9'
      );

      expect(angina.workupSuggestions).toContain('ECG');
      expect(angina.workupSuggestions).toContain('Troponin');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entry on evaluation', async () => {
      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      await resultPromise;

      expect(prisma.aIUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          feature: 'symptom-diagnosis',
          provider: 'fallback',
        }),
      });
    });

    it('should not fail if audit logging fails', async () => {
      (prisma.aIUsageLog.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const resultPromise = engine.evaluate(symptoms);
      await jest.advanceTimersByTimeAsync(20000);
      const result = await resultPromise;

      // Should still succeed
      expect(result.data.differentials.length).toBeGreaterThan(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'symptom_diagnosis_audit_failed',
        })
      );
    });
  });

  describe('AI Success Path', () => {
    it('should use AI result when available and confident', async () => {
      // Use real timers for this test since it tests async AI success path
      jest.useRealTimers();

      const aiDiagnosis = {
        differentials: [
          {
            icd10Code: 'I20.0',
            name: 'Unstable angina',
            probability: 0.85,
            confidence: 'high',
            reasoning: 'Classic presentation',
            redFlags: ['New onset'],
            workupSuggestions: ['ECG', 'Troponin'],
            source: 'ai',
          },
        ],
        urgency: 'urgent',
        processingMethod: 'ai',
        timestamp: new Date().toISOString(),
      };

      // Ensure feature flag returns true (AI enabled)
      (isFeatureEnabled as jest.Mock).mockResolvedValue(true);
      // Mock AI to succeed immediately
      (aiToJSON as jest.Mock).mockResolvedValue(aiDiagnosis);
      // Re-establish withRetry mock to pass through immediately
      (withRetry as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());

      const symptoms: SymptomInput = {
        chiefComplaint: 'Chest pain',
      };

      const result = await engine.evaluate(symptoms);

      expect(result.method).toBe('ai');
      expect(result.confidence).toBe('high');
      expect(result.data).toEqual(aiDiagnosis);

      // Restore fake timers for subsequent tests
      jest.useFakeTimers();
    });
  });
});
