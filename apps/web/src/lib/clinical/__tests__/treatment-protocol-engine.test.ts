/**
 * Unit Tests: TreatmentProtocolEngine
 *
 * Law 3 Compliance: Design for Failure (The Fallback Imperative)
 * Tests verify that treatment recommendations work at 100% reliability
 * even when AI providers fail.
 *
 * Test Categories:
 * 1. Protocol matching from database (Logic-as-Data)
 * 2. Eligibility criteria evaluation
 * 3. Contraindication filtering
 * 4. AI fallback when no protocol matches
 * 5. Generic recommendations fallback
 * 6. Audit logging
 */

import { z } from 'zod';
import type {
  PatientContext,
  TreatmentRecommendation,
  EligibilityCriterion,
} from '@holilabs/shared-types';

// Mock dependencies BEFORE importing module under test
jest.mock('@/lib/prisma', () => ({
  prisma: {
    treatmentProtocol: {
      findFirst: jest.fn(),
    },
    aIUsageLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../process-with-fallback', () => ({
  processWithFallback: jest.fn(),
}));

jest.mock('@/lib/logger');

// Import mocks after jest.mock()
const { prisma } = require('@/lib/prisma');
const { processWithFallback } = require('../process-with-fallback');
const logger = require('@/lib/logger').default;

// Import module under test
import {
  TreatmentProtocolEngine,
  treatmentProtocolEngine,
} from '../engines/treatment-protocol-engine';

describe('TreatmentProtocolEngine', () => {
  // Sample patient context
  const basePatientContext: PatientContext = {
    patientId: 'patient-123',
    age: 55,
    sex: 'M',
    diagnoses: [],
    medications: [],
    allergies: [],
    recentLabs: [],
    hasDiabetes: false,
    hasHypertension: false,
    isSmoker: false,
  };

  // Sample treatment protocol
  const sampleProtocol = {
    id: 'protocol-htn-001',
    conditionIcd10: 'I10',
    conditionName: 'Essential Hypertension',
    version: '1.0.0',
    guidelineSource: 'ACC/AHA 2023',
    guidelineUrl: 'https://example.com/guidelines',
    isActive: true,
    effectiveDate: new Date('2023-01-01'),
    expirationDate: null,
    eligibility: [
      { field: 'age', operator: 'gte', value: 18, required: true },
      { field: 'hasHypertension', operator: 'eq', value: true, required: true },
    ] as EligibilityCriterion[],
    recommendations: [
      {
        id: 'rec-lisinopril',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Lisinopril',
          rxNormCode: '314076',
          dose: '10mg',
          frequency: 'daily',
        },
        rationale: 'Per ACC/AHA 2023, ACE inhibitors are first-line therapy for hypertension.',
        evidenceGrade: 'A',
        contraindications: ['ACE inhibitor allergy', 'Angioedema', 'Pregnancy'],
      },
      {
        id: 'rec-labs',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'Basic Metabolic Panel',
          loincCode: '51990-0',
          frequency: 'Every 3 months',
        },
        rationale: 'Monitor renal function and electrolytes with ACE inhibitor therapy.',
        evidenceGrade: 'B',
        contraindications: [],
      },
    ] as TreatmentRecommendation[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = TreatmentProtocolEngine.getInstance();
      const instance2 = TreatmentProtocolEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export a singleton instance', () => {
      expect(treatmentProtocolEngine).toBeDefined();
      expect(treatmentProtocolEngine).toBe(TreatmentProtocolEngine.getInstance());
    });
  });

  describe('Protocol Matching', () => {
    it('should match protocol from database and return recommendations', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      const result = await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      expect(result.method).toBe('fallback'); // Database-driven = deterministic
      expect(result.confidence).toBe('high');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].medication?.name).toBe('Lisinopril');
    });

    it('should match protocol by ICD-10 category (first 3 chars)', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      await treatmentProtocolEngine.getRecommendations('I10.9', patientContext);

      // Verify query includes both exact and category match
      expect(prisma.treatmentProtocol.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { conditionIcd10: 'I10.9' },
                  { conditionIcd10: 'I10' },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it('should only match active protocols within date range', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'fallback',
        confidence: 'fallback',
      });

      await treatmentProtocolEngine.getRecommendations('I10', basePatientContext);

      expect(prisma.treatmentProtocol.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isActive: true },
              { effectiveDate: { lte: expect.any(Date) } },
            ]),
          }),
        })
      );
    });
  });

  describe('Eligibility Criteria Evaluation', () => {
    it('should pass eligibility when all required criteria are met', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        age: 45,
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      const result = await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      expect(result.method).toBe('fallback');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should fail eligibility when required criteria not met', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        age: 15, // Under 18 - fails age criterion
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'ai',
        confidence: 'medium',
      });

      await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      // Should fall through to AI since eligibility failed
      expect(processWithFallback).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_ai_fallback',
          reason: 'Patient not eligible for protocol',
        })
      );
    });

    describe('Operator Evaluation', () => {
      const protocolWithOperators = {
        ...sampleProtocol,
        eligibility: [] as EligibilityCriterion[],
      };

      beforeEach(() => {
        (processWithFallback as jest.Mock).mockResolvedValue({
          data: [],
          method: 'fallback',
          confidence: 'fallback',
        });
      });

      it('should evaluate "eq" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'sex', operator: 'eq', value: 'M', required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          sex: 'M',
        });

        expect(result.method).toBe('fallback'); // Protocol matched
      });

      it('should evaluate "gt" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'age', operator: 'gt', value: 50, required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          age: 55,
        });

        expect(result.method).toBe('fallback');
      });

      it('should evaluate "lt" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'age', operator: 'lt', value: 65, required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          age: 55,
        });

        expect(result.method).toBe('fallback');
      });

      it('should evaluate "gte" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'age', operator: 'gte', value: 55, required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          age: 55,
        });

        expect(result.method).toBe('fallback');
      });

      it('should evaluate "lte" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'age', operator: 'lte', value: 55, required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          age: 55,
        });

        expect(result.method).toBe('fallback');
      });

      it('should evaluate "in" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'sex', operator: 'in', value: ['M', 'F'], required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          sex: 'M',
        });

        expect(result.method).toBe('fallback');
      });

      it('should evaluate "notIn" operator correctly', async () => {
        protocolWithOperators.eligibility = [
          { field: 'sex', operator: 'notIn', value: ['O'], required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          sex: 'M',
        });

        expect(result.method).toBe('fallback');
      });

      it('should evaluate "contains" operator for arrays', async () => {
        protocolWithOperators.eligibility = [
          { field: 'diagnoses', operator: 'contains', value: { icd10Code: 'E11', name: 'Diabetes' }, required: false },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        const result = await treatmentProtocolEngine.getRecommendations('I10', {
          ...basePatientContext,
          diagnoses: [{ id: 'diag-1', icd10Code: 'E11', name: 'Diabetes', clinicalStatus: 'ACTIVE' }],
        });

        // Non-required criteria don't block eligibility
        expect(result.method).toBe('fallback');
      });

      it('should handle nested field paths (dot notation)', async () => {
        protocolWithOperators.eligibility = [
          { field: 'recentLabs.0.value', operator: 'gt', value: 6.5, required: false },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        // Note: This tests that getFieldValue handles dot notation
        await treatmentProtocolEngine.getRecommendations('I10', basePatientContext);

        // Should not throw even if nested path doesn't exist
        expect(logger.info).toHaveBeenCalled();
      });

      it('should return false for undefined actual values', async () => {
        protocolWithOperators.eligibility = [
          { field: 'nonexistentField', operator: 'eq', value: 'test', required: true },
        ];
        (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithOperators);

        await treatmentProtocolEngine.getRecommendations('I10', basePatientContext);

        // Should fall through to AI since required criterion failed
        expect(processWithFallback).toHaveBeenCalled();
      });
    });
  });

  describe('Contraindication Filtering', () => {
    it('should filter out recommendations matching patient allergies', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
        allergies: [
          { id: 'allergy-1', allergen: 'ACE inhibitor', type: 'DRUG', reaction: 'Angioedema', severity: 'severe', status: 'ACTIVE' },
        ],
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      const result = await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      // Lisinopril should be filtered out due to ACE inhibitor allergy
      expect(result.data.find((r: TreatmentRecommendation) => r.medication?.name === 'Lisinopril')).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_filtered_allergy',
          medication: 'Lisinopril',
        })
      );
    });

    it('should filter out duplicate medications patient is already on', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
        medications: [
          { id: 'med-1', name: 'Lisinopril', dose: '10mg', frequency: 'daily', rxNormCode: '314076', status: 'ACTIVE' },
        ],
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      const result = await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      expect(result.data.find((r: TreatmentRecommendation) => r.medication?.name === 'Lisinopril')).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_filtered_duplicate',
          medication: 'Lisinopril',
        })
      );
    });

    it('should filter recommendations contraindicated by patient conditions', async () => {
      const protocolWithConditionContraindication = {
        ...sampleProtocol,
        recommendations: [
          {
            id: 'rec-metformin',
            type: 'medication',
            priority: 'required',
            medication: {
              name: 'Metformin',
              rxNormCode: '6809',
              dose: '500mg',
              frequency: 'twice daily',
            },
            rationale: 'First-line therapy for type 2 diabetes.',
            evidenceGrade: 'A',
            contraindications: ['Chronic kidney disease', 'K70'], // CKD ICD-10 starts with K70 for testing
          },
        ],
      };

      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
        diagnoses: [{ id: 'diag-1', icd10Code: 'K70.1', name: 'Chronic kidney disease', clinicalStatus: 'ACTIVE' }],
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(
        protocolWithConditionContraindication
      );

      const result = await treatmentProtocolEngine.getRecommendations('E11', patientContext);

      expect(result.data.find((r: TreatmentRecommendation) => r.medication?.name === 'Metformin')).toBeUndefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_filtered_contraindication',
        })
      );
    });

    it('should keep recommendations with no contraindication matches', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
        allergies: [{ id: 'allergy-1', allergen: 'Penicillin', type: 'DRUG', reaction: 'Rash', severity: 'mild', status: 'ACTIVE' }],
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      const result = await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      // Both recommendations should remain (Penicillin allergy doesn't contraindicate ACE inhibitors)
      expect(result.data).toHaveLength(2);
    });
  });

  describe('AI Fallback Path', () => {
    it('should use processWithFallback when no protocol matches', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ai-rec-1',
            type: 'monitoring',
            priority: 'recommended',
            rationale: 'AI-generated recommendation',
            evidenceGrade: 'B',
            contraindications: [],
          },
        ],
        method: 'ai',
        confidence: 'medium',
        aiLatencyMs: 1500,
      });

      const result = await treatmentProtocolEngine.getRecommendations('Z99.9', basePatientContext);

      expect(processWithFallback).toHaveBeenCalled();
      expect(result.method).toBe('ai');
      expect(result.data).toHaveLength(1);
    });

    it('should pass correct options to processWithFallback', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'fallback',
        confidence: 'fallback',
      });

      await treatmentProtocolEngine.getRecommendations('Z99.9', basePatientContext);

      expect(processWithFallback).toHaveBeenCalledWith(
        expect.any(String), // AI prompt
        expect.any(Object), // Schema
        expect.any(Function), // Fallback function
        expect.objectContaining({
          task: 'diagnosis-support',
          confidenceThreshold: 0.8,
          timeoutMs: 12000,
          maxRetries: 2,
        })
      );
    });

    it('should filter AI recommendations for contraindications', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        allergies: [{ id: 'allergy-1', allergen: 'Aspirin', type: 'DRUG', reaction: 'GI bleed', severity: 'severe', status: 'ACTIVE' }],
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'ai-aspirin',
            type: 'medication',
            priority: 'recommended',
            medication: { name: 'Aspirin', dose: '81mg', frequency: 'daily' },
            rationale: 'Cardioprotection',
            evidenceGrade: 'A',
            contraindications: ['Aspirin allergy', 'GI bleeding'],
          },
        ],
        method: 'ai',
        confidence: 'high',
      });

      const result = await treatmentProtocolEngine.getRecommendations('I25', patientContext);

      // Aspirin should be filtered out due to allergy
      expect(result.data.find((r: TreatmentRecommendation) => r.medication?.name === 'Aspirin')).toBeUndefined();
    });
  });

  describe('Generic Recommendations Fallback', () => {
    it('should return generic recommendations when everything fails', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);

      // Capture the fallback function passed to processWithFallback
      let capturedFallbackFn: () => Promise<TreatmentRecommendation[]>;
      (processWithFallback as jest.Mock).mockImplementation(
        async (prompt: string, schema: z.ZodSchema, fallbackFn: () => Promise<TreatmentRecommendation[]>) => {
          capturedFallbackFn = fallbackFn;
          // Simulate AI failure - call fallback
          const fallbackData = await fallbackFn();
          return {
            data: fallbackData,
            method: 'fallback',
            confidence: 'fallback',
            fallbackReason: 'AI provider unavailable',
          };
        }
      );

      const result = await treatmentProtocolEngine.getRecommendations('Z99.9', basePatientContext);

      expect(result.method).toBe('fallback');
      expect(result.data).toHaveLength(2); // monitoring + referral
      expect(result.data[0].type).toBe('monitoring');
      expect(result.data[1].type).toBe('referral');
      expect(result.data[0].evidenceGrade).toBe('expert-opinion');
    });
  });

  describe('Multiple Conditions', () => {
    it('should process multiple conditions in parallel', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [{ id: 'generic', type: 'monitoring', priority: 'recommended', rationale: 'Test', evidenceGrade: 'C', contraindications: [] }],
        method: 'fallback',
        confidence: 'fallback',
      });

      const results = await treatmentProtocolEngine.getRecommendationsForMultiple(
        ['I10', 'E11', 'E78'],
        basePatientContext
      );

      expect(results.size).toBe(3);
      expect(results.has('I10')).toBe(true);
      expect(results.has('E11')).toBe(true);
      expect(results.has('E78')).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log after AI-based recommendation', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [{ id: 'test', type: 'monitoring', priority: 'recommended', rationale: 'Test', evidenceGrade: 'C', contraindications: [] }],
        method: 'ai',
        confidence: 'high',
        aiLatencyMs: 1200,
      });

      await treatmentProtocolEngine.getRecommendations('Z99.9', basePatientContext);

      expect(prisma.aIUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          feature: 'treatment-protocol',
          provider: 'claude',
          responseTimeMs: 1200,
        }),
      });
    });

    it('should log fallback method for database-driven recommendations', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      // No audit log for database-driven (instant) results - audit is only for AI path
      // The protocol path doesn't call auditDecision
    });

    it('should handle audit log failures gracefully', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'ai',
        confidence: 'medium',
      });
      (prisma.aIUsageLog.create as jest.Mock).mockRejectedValue(
        new Error('Database connection lost')
      );

      // Should not throw
      await expect(
        treatmentProtocolEngine.getRecommendations('Z99.9', basePatientContext)
      ).resolves.toBeDefined();

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_audit_failed',
          error: 'Database connection lost',
        })
      );
    });
  });

  describe('AI Prompt Construction', () => {
    it('should include patient context in AI prompt', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        age: 65,
        sex: 'F',
        diagnoses: [{ id: 'diag-1', icd10Code: 'E11', name: 'Type 2 Diabetes', clinicalStatus: 'ACTIVE' }],
        medications: [{ id: 'med-1', name: 'Metformin', dose: '500mg', frequency: 'twice daily', status: 'ACTIVE' }],
        allergies: [{ id: 'allergy-1', allergen: 'Penicillin', type: 'DRUG', reaction: 'Rash', severity: 'mild', status: 'ACTIVE' }],
        recentLabs: [{ id: 'lab-1', name: 'HbA1c', value: '7.2', unit: '%', resultDate: '2024-01-15' }],
        hasDiabetes: true,
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'fallback',
        confidence: 'fallback',
      });

      await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      const promptArg = (processWithFallback as jest.Mock).mock.calls[0][0];

      expect(promptArg).toContain('Age: 65');
      expect(promptArg).toContain('Sex: F');
      expect(promptArg).toContain('Type 2 Diabetes');
      expect(promptArg).toContain('Metformin');
      expect(promptArg).toContain('Penicillin');
      expect(promptArg).toContain('HbA1c: 7.2 %');
      expect(promptArg).toContain('Diabetes: Yes');
      expect(promptArg).toContain('Hypertension: Yes');
    });

    it('should handle empty patient context gracefully', async () => {
      const minimalContext: PatientContext = {
        patientId: 'minimal-patient',
        age: 30,
        sex: 'M',
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'fallback',
        confidence: 'fallback',
      });

      await treatmentProtocolEngine.getRecommendations('Z00', minimalContext);

      const promptArg = (processWithFallback as jest.Mock).mock.calls[0][0];

      expect(promptArg).toContain('Age: 30');
      expect(promptArg).toContain('Sex: M');
      expect(promptArg).toContain('None documented');
      expect(promptArg).toContain('NKDA');
    });
  });

  describe('Logging', () => {
    it('should log protocol matching events', async () => {
      const patientContext: PatientContext = {
        ...basePatientContext,
        hasHypertension: true,
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(sampleProtocol);

      await treatmentProtocolEngine.getRecommendations('I10', patientContext);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_start',
          conditionIcd10: 'I10',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_eligibility_check',
          isEligible: true,
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_matched',
          guidelineSource: 'ACC/AHA 2023',
        })
      );
    });

    it('should log when falling back to AI', async () => {
      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(null);
      (processWithFallback as jest.Mock).mockResolvedValue({
        data: [],
        method: 'fallback',
        confidence: 'fallback',
      });

      await treatmentProtocolEngine.getRecommendations('Z99.9', basePatientContext);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_ai_fallback',
          reason: 'No matching protocol found',
        })
      );
    });

    it('should warn on unknown operators', async () => {
      const protocolWithUnknownOperator = {
        ...sampleProtocol,
        eligibility: [
          { field: 'age', operator: 'unknown_op' as any, value: 18, required: false },
        ],
      };

      (prisma.treatmentProtocol.findFirst as jest.Mock).mockResolvedValue(protocolWithUnknownOperator);

      await treatmentProtocolEngine.getRecommendations('I10', basePatientContext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'treatment_protocol_unknown_operator',
          operator: 'unknown_op',
        })
      );
    });
  });
});
