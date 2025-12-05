/**
 * Unit Tests for Confidence Scoring System
 */

import { confidenceScoringService } from '@/lib/ai/confidence-scoring';
import type { SOAPSections, MedicalEntity } from '@/lib/clinical-notes/soap-generator';

describe('ConfidenceScoringService', () => {
  describe('scoreSOAPNote', () => {
    it('should score a complete, high-quality SOAP note highly', () => {
      const sections: SOAPSections = {
        subjective: 'Patient is a 55-year-old male presenting with chest pain that started 2 hours ago. Pain is described as pressure-like, radiating to left arm. Associated with shortness of breath and diaphoresis. No prior cardiac history.',
        objective: 'Vital Signs: BP 145/90, HR 88, RR 18, Temp 98.6°F, O2 Sat 96% on room air. Physical Exam: Alert and oriented, mild diaphoresis. Cardiovascular: Regular rhythm, no murmurs. Respiratory: Clear to auscultation bilaterally.',
        assessment: 'Probable unstable angina. Differential includes myocardial infarction, GERD, musculoskeletal pain. Hypertension inadequately controlled. EKG shows ST segment changes consistent with ischemia.',
        plan: '1. Start nitroglycerin sublingual 0.4mg PRN chest pain\n2. Aspirin 325mg PO now\n3. Order troponin, CK-MB\n4. Cardiology consult\n5. Admit to telemetry for monitoring\n6. Follow-up EKG in 6 hours',
      };

      const entities: MedicalEntity[] = [
        {
          id: 0,
          text: 'chest pain',
          category: 'MEDICAL_CONDITION',
          type: 'DX_NAME',
          score: 0.95,
          beginOffset: 0,
          endOffset: 10,
        },
        {
          id: 1,
          text: 'nitroglycerin',
          category: 'MEDICATION',
          type: 'GENERIC_NAME',
          score: 0.98,
          beginOffset: 100,
          endOffset: 113,
        },
      ];

      const result = confidenceScoringService.scoreSOAPNote(sections, entities, 'chest pain');

      expect(result.overall).toBeGreaterThan(0.7);
      expect(result.breakdown.completeness).toBeGreaterThan(0.8);
      expect(result.breakdown.entityQuality).toBeGreaterThan(0.8);
      expect(result.requiresReview).toBe(false);
    });

    it('should flag incomplete sections', () => {
      const sections: SOAPSections = {
        subjective: 'Brief',
        objective: 'Very brief',
        assessment: 'Too short',
        plan: 'Short',
      };

      const entities: MedicalEntity[] = [];

      const result = confidenceScoringService.scoreSOAPNote(sections, entities);

      expect(result.overall).toBeLessThan(0.5);
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.flags.some(f => f.category === 'completeness')).toBe(true);
      expect(result.requiresReview).toBe(true);
    });

    it('should detect missing diagnosis in assessment', () => {
      const sections: SOAPSections = {
        subjective: 'Patient presents with various symptoms including headache and fatigue.',
        objective: 'Vital signs are normal. Physical exam unremarkable.',
        assessment: 'Patient has some issues.', // No diagnosis
        plan: 'Follow up in 2 weeks.',
      };

      const entities: MedicalEntity[] = [];

      const result = confidenceScoringService.scoreSOAPNote(sections, entities);

      expect(result.flags.some(f => f.severity === 'critical' && f.section === 'assessment')).toBe(true);
    });

    it('should handle notes with high entity quality', () => {
      const sections: SOAPSections = {
        subjective: 'Patient reports severe migraine headaches for 3 days.',
        objective: 'Neurological exam normal, no focal deficits.',
        assessment: 'Migraine headache, likely tension-type.',
        plan: 'Sumatriptan 100mg PO now, follow up if symptoms persist.',
      };

      const entities: MedicalEntity[] = [
        {
          id: 0,
          text: 'migraine',
          category: 'MEDICAL_CONDITION',
          type: 'DX_NAME',
          score: 0.96,
          beginOffset: 0,
          endOffset: 8,
        },
        {
          id: 1,
          text: 'Sumatriptan',
          category: 'MEDICATION',
          type: 'GENERIC_NAME',
          score: 0.99,
          beginOffset: 50,
          endOffset: 61,
        },
      ];

      const result = confidenceScoringService.scoreSOAPNote(sections, entities);

      expect(result.breakdown.entityQuality).toBeGreaterThan(0.9);
    });
  });

  describe('getConfidenceThreshold', () => {
    it('should return the confidence threshold', () => {
      const threshold = confidenceScoringService.getConfidenceThreshold();
      expect(threshold).toBe(0.70);
    });
  });

  describe('meetsApprovalThreshold', () => {
    it('should return true for scores above threshold', () => {
      expect(confidenceScoringService.meetsApprovalThreshold(0.8)).toBe(true);
    });

    it('should return false for scores below threshold', () => {
      expect(confidenceScoringService.meetsApprovalThreshold(0.6)).toBe(false);
    });
  });
});
