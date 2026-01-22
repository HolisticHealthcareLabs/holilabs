/**
 * Unified Types Tests
 *
 * P2-005: Tests for unified AI task types and configuration
 * All data is synthetic - NO PHI
 */

import {
  UNIFIED_TASK_CONFIG,
  LEGACY_TASK_MAP,
  normalizeTask,
  getTaskConfig,
  getProviderForTask,
  prefersLocalProvider,
  getTasksForProvider,
  getSafetyCriticalTasks,
  getLocalPreferredTasks,
  type UnifiedAITask,
  type LegacyAITask,
  type AIProviderType,
} from '../types';
import {
  allUnifiedTasks,
  unifiedLocalPreferredTasks,
  unifiedSafetyCriticalTasks,
} from '../test-fixtures/test-data';

describe('types', () => {
  describe('UNIFIED_TASK_CONFIG', () => {
    it('should have configuration for all unified task types', () => {
      allUnifiedTasks.forEach((task) => {
        expect(UNIFIED_TASK_CONFIG[task]).toBeDefined();
        expect(UNIFIED_TASK_CONFIG[task].task).toBe(task);
        expect(UNIFIED_TASK_CONFIG[task].primaryProvider).toBeDefined();
        expect(UNIFIED_TASK_CONFIG[task].fallbackProviders).toBeInstanceOf(Array);
        expect(typeof UNIFIED_TASK_CONFIG[task].preferLocal).toBe('boolean');
        expect(UNIFIED_TASK_CONFIG[task].rationale).toBeTruthy();
      });
    });

    it('should route safety-critical tasks to Claude', () => {
      const claudeTasks: UnifiedAITask[] = [
        'drug-interaction',
        'diagnosis-support',
        'prescription-review',
        'lab-interpretation',
        'soap-generation',
      ];

      claudeTasks.forEach((task) => {
        expect(UNIFIED_TASK_CONFIG[task].primaryProvider).toBe('claude');
      });
    });

    it('should route commodity tasks to Gemini', () => {
      const geminiTasks: UnifiedAITask[] = [
        'translation',
        'summarization',
        'clinical-notes',
        'patient-education',
        'billing-codes',
        'scheduling',
        'referral-letter',
        'general',
      ];

      geminiTasks.forEach((task) => {
        expect(UNIFIED_TASK_CONFIG[task].primaryProvider).toBe('gemini');
      });
    });

    it('should route transcript-summary to Ollama (local)', () => {
      expect(UNIFIED_TASK_CONFIG['transcript-summary'].primaryProvider).toBe('ollama');
      expect(UNIFIED_TASK_CONFIG['transcript-summary'].preferLocal).toBe(true);
    });

    it('should route icd-coding to Together (Meditron)', () => {
      expect(UNIFIED_TASK_CONFIG['icd-coding'].primaryProvider).toBe('together');
    });

    it('should have zero cost for local providers', () => {
      expect(UNIFIED_TASK_CONFIG['transcript-summary'].estimatedCostPer1k).toBe(0);
    });

    it('should have higher cost for Claude than Gemini', () => {
      const claudeCost = UNIFIED_TASK_CONFIG['drug-interaction'].estimatedCostPer1k;
      const geminiCost = UNIFIED_TASK_CONFIG['translation'].estimatedCostPer1k;
      expect(claudeCost).toBeGreaterThan(geminiCost);
    });
  });

  describe('LEGACY_TASK_MAP', () => {
    it('should map all legacy SCREAMING_SNAKE_CASE tasks', () => {
      const legacyTasks: LegacyAITask[] = [
        'TRANSCRIPT_SUMMARY',
        'SOAP_GENERATION',
        'DRUG_INTERACTION',
        'PRESCRIPTION_REVIEW',
        'ICD_CODING',
        'LAB_INTERPRETATION',
        'DIFFERENTIAL_DIAGNOSIS',
        'PATIENT_EDUCATION',
        'CLINICAL_NOTES',
        'TRANSLATION',
        'BILLING_CODES',
        'SCHEDULING',
        'REFERRAL_LETTER',
        'GENERAL',
      ];

      legacyTasks.forEach((task) => {
        expect(LEGACY_TASK_MAP[task]).toBeDefined();
        expect(typeof LEGACY_TASK_MAP[task]).toBe('string');
      });
    });

    it('should correctly map TRANSCRIPT_SUMMARY to transcript-summary', () => {
      expect(LEGACY_TASK_MAP['TRANSCRIPT_SUMMARY']).toBe('transcript-summary');
    });

    it('should correctly map DIFFERENTIAL_DIAGNOSIS to diagnosis-support', () => {
      expect(LEGACY_TASK_MAP['DIFFERENTIAL_DIAGNOSIS']).toBe('diagnosis-support');
    });
  });

  describe('normalizeTask', () => {
    it('should convert legacy SCREAMING_SNAKE_CASE to kebab-case', () => {
      expect(normalizeTask('DRUG_INTERACTION')).toBe('drug-interaction');
      expect(normalizeTask('TRANSCRIPT_SUMMARY')).toBe('transcript-summary');
      expect(normalizeTask('SOAP_GENERATION')).toBe('soap-generation');
    });

    it('should pass through already-normalized tasks', () => {
      expect(normalizeTask('drug-interaction')).toBe('drug-interaction');
      expect(normalizeTask('translation')).toBe('translation');
      expect(normalizeTask('general')).toBe('general');
    });

    it('should return general for unknown tasks', () => {
      expect(normalizeTask('UNKNOWN_TASK')).toBe('general');
      expect(normalizeTask('invalid')).toBe('general');
    });
  });

  describe('getTaskConfig', () => {
    it('should return config for unified tasks', () => {
      const config = getTaskConfig('drug-interaction');
      expect(config.task).toBe('drug-interaction');
      expect(config.primaryProvider).toBe('claude');
    });

    it('should return config for legacy tasks', () => {
      const config = getTaskConfig('DRUG_INTERACTION');
      expect(config.task).toBe('drug-interaction');
      expect(config.primaryProvider).toBe('claude');
    });

    it('should return general config for unknown tasks', () => {
      const config = getTaskConfig('UNKNOWN');
      expect(config.task).toBe('general');
    });
  });

  describe('getProviderForTask', () => {
    it('should return claude for safety-critical tasks', () => {
      expect(getProviderForTask('drug-interaction')).toBe('claude');
      expect(getProviderForTask('diagnosis-support')).toBe('claude');
      expect(getProviderForTask('prescription-review')).toBe('claude');
    });

    it('should return gemini for commodity tasks', () => {
      expect(getProviderForTask('translation')).toBe('gemini');
      expect(getProviderForTask('billing-codes')).toBe('gemini');
      expect(getProviderForTask('scheduling')).toBe('gemini');
    });

    it('should handle legacy task names', () => {
      expect(getProviderForTask('DRUG_INTERACTION')).toBe('claude');
      expect(getProviderForTask('TRANSLATION')).toBe('gemini');
    });
  });

  describe('prefersLocalProvider', () => {
    it('should return true for transcript-summary', () => {
      expect(prefersLocalProvider('transcript-summary')).toBe(true);
    });

    it('should return false for cloud tasks', () => {
      expect(prefersLocalProvider('drug-interaction')).toBe(false);
      expect(prefersLocalProvider('translation')).toBe(false);
    });

    it('should handle legacy task names', () => {
      expect(prefersLocalProvider('TRANSCRIPT_SUMMARY')).toBe(true);
    });
  });

  describe('getTasksForProvider', () => {
    it('should return all Claude tasks', () => {
      const claudeTasks = getTasksForProvider('claude');
      expect(claudeTasks).toContain('drug-interaction');
      expect(claudeTasks).toContain('diagnosis-support');
      expect(claudeTasks).toContain('prescription-review');
      expect(claudeTasks).toContain('lab-interpretation');
      expect(claudeTasks).toContain('soap-generation');
    });

    it('should return all Gemini tasks', () => {
      const geminiTasks = getTasksForProvider('gemini');
      expect(geminiTasks).toContain('translation');
      expect(geminiTasks).toContain('summarization');
      expect(geminiTasks).toContain('clinical-notes');
      expect(geminiTasks).toContain('general');
    });

    it('should return Ollama task', () => {
      const ollamaTasks = getTasksForProvider('ollama');
      expect(ollamaTasks).toContain('transcript-summary');
    });

    it('should return Together task', () => {
      const togetherTasks = getTasksForProvider('together');
      expect(togetherTasks).toContain('icd-coding');
    });
  });

  describe('getSafetyCriticalTasks', () => {
    it('should return all Claude tasks', () => {
      const safeTasks = getSafetyCriticalTasks();
      expect(safeTasks.length).toBeGreaterThan(0);
      safeTasks.forEach((task) => {
        expect(UNIFIED_TASK_CONFIG[task].primaryProvider).toBe('claude');
      });
    });
  });

  describe('getLocalPreferredTasks', () => {
    it('should return tasks with preferLocal=true', () => {
      const localTasks = getLocalPreferredTasks();
      expect(localTasks).toContain('transcript-summary');
      localTasks.forEach((task) => {
        expect(UNIFIED_TASK_CONFIG[task].preferLocal).toBe(true);
      });
    });
  });
});
