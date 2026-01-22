/**
 * Test Data Fixtures for AI Tests
 *
 * All data is SYNTHETIC - NO PHI
 * These fixtures simulate various clinical scenarios without using real patient data
 */

import type { ClinicalTask } from '../router';

// =============================================================================
// Test User IDs
// =============================================================================

export const testUserIds = {
  standard: 'test-user-standard-001',
  withBYOK: 'test-user-byok-002',
  noCreds: 'test-user-nocreds-003',
  premium: 'test-user-premium-004',
};

// =============================================================================
// Mock User API Key (for BYOK tests)
// =============================================================================

export const mockUserAPIKey = {
  id: 'key-test-001',
  userId: testUserIds.withBYOK,
  provider: 'anthropic',
  encryptedKey: 'encrypted-test-key-data',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// =============================================================================
// Test Messages
// =============================================================================

export const testMessages = {
  // Simple message - short, no complex keywords
  simple: [
    {
      role: 'user' as const,
      content: 'What are the common symptoms of a cold?',
    },
  ],

  // Moderate message - medium length (>300 chars to trigger moderate complexity)
  moderate: [
    {
      role: 'user' as const,
      content:
        'I have a patient presenting with mild fatigue, occasional headaches, and some difficulty sleeping. They have been experiencing these symptoms for about two weeks now. Their vitals are stable and within normal ranges. No significant past medical history noted. What are some possible causes and recommended next steps for evaluation? Should I order any specific lab tests?',
    },
  ],

  // Complex message - long (>1000 chars)
  complex: [
    {
      role: 'user' as const,
      content: `I have a patient presenting with a complex set of symptoms that has been ongoing for several months. The patient is a 45-year-old with no significant past medical history. They report progressive fatigue that started about three months ago and has been gradually worsening. Additionally, they have noticed some unintentional weight loss of approximately 10 pounds over the past two months. They also report occasional night sweats and intermittent low-grade fever.

Their physical examination reveals mild hepatomegaly and some enlarged lymph nodes in the cervical and axillary regions. Laboratory results show a hemoglobin of 10.5, white blood cell count elevated at 15,000, and platelet count slightly reduced at 130,000. Their comprehensive metabolic panel is largely unremarkable except for mildly elevated LDH.

I am considering a differential diagnosis that includes lymphoma, leukemia, and potentially infectious etiologies such as tuberculosis or EBV. What additional workup would you recommend, and what would be your approach to prioritizing these diagnostic considerations?`,
    },
  ],

  // Multi-turn conversation (>5 messages)
  multiTurn: [
    { role: 'user' as const, content: 'What is hypertension?' },
    {
      role: 'assistant' as const,
      content:
        'Hypertension is high blood pressure, typically defined as 140/90 mmHg or higher.',
    },
    { role: 'user' as const, content: 'What causes it?' },
    {
      role: 'assistant' as const,
      content:
        'Causes include genetics, obesity, diet high in salt, and lack of exercise.',
    },
    { role: 'user' as const, content: 'How is it treated?' },
    {
      role: 'assistant' as const,
      content:
        'Treatment includes lifestyle changes and medications like ACE inhibitors.',
    },
    { role: 'user' as const, content: 'What are the risks if untreated?' },
  ],

  // Critical message - emergency keywords
  critical: [
    {
      role: 'user' as const,
      content:
        'URGENT: Patient presenting with severe chest pain and shortness of breath. Need emergency assessment of possible myocardial infarction.',
    },
  ],

  // Critical message - Spanish emergency keywords
  criticalSpanish: [
    {
      role: 'user' as const,
      content:
        'EMERGENCIA: Paciente con dolor de pecho severo y dificultad para respirar. Evaluación urgente necesaria.',
    },
  ],

  // Complex keywords (differential, diagnosis)
  complexKeywords: [
    {
      role: 'user' as const,
      content:
        'Please provide a differential diagnosis for a patient with unexplained weight loss and fatigue.',
    },
  ],
};

// =============================================================================
// Clinical Tasks
// =============================================================================

// All defined clinical tasks
export const allClinicalTasks: ClinicalTask[] = [
  'drug-interaction',
  'diagnosis-support',
  'prescription-review',
  'lab-interpretation',
  'clinical-notes',
  'patient-education',
  'translation',
  'summarization',
  'billing-codes',
  'scheduling',
  'referral-letter',
  'general',
];

// Safety-critical tasks (should route to Claude)
export const safetyCriticalTasks: ClinicalTask[] = [
  'drug-interaction',
  'diagnosis-support',
  'prescription-review',
  'lab-interpretation',
];

// Commodity tasks (should route to Gemini)
export const commodityTasks: ClinicalTask[] = [
  'clinical-notes',
  'patient-education',
  'translation',
  'summarization',
  'billing-codes',
  'scheduling',
  'referral-letter',
  'general',
];

// =============================================================================
// AI Tasks (for task-router tests)
// =============================================================================

// Re-export AITask from task-router to ensure type consistency
export type { AITask } from '../providers/task-router';

// P2-005: Import unified types for new tests
import type { UnifiedAITask, LegacyAITask } from '../types';
export type { UnifiedAITask, LegacyAITask } from '../types';

// All defined AI tasks (legacy SCREAMING_SNAKE_CASE format)
export const allAITasks = [
  'TRANSCRIPT_SUMMARY',
  'SOAP_GENERATION',
  'CLINICAL_NOTES',
  'DRUG_INTERACTION',
  'PRESCRIPTION_REVIEW',
  'ICD_CODING',
  'LAB_INTERPRETATION',
  'DIFFERENTIAL_DIAGNOSIS',
  'PATIENT_EDUCATION',
  'TRANSLATION',
  'BILLING_CODES',
  'SCHEDULING',
  'REFERRAL_LETTER',
  'GENERAL',
] as const;

// P2-005: All unified task types
export const allUnifiedTasks: UnifiedAITask[] = [
  'drug-interaction',
  'diagnosis-support',
  'prescription-review',
  'lab-interpretation',
  'translation',
  'summarization',
  'clinical-notes',
  'patient-education',
  'billing-codes',
  'scheduling',
  'referral-letter',
  'transcript-summary',
  'soap-generation',
  'icd-coding',
  'general',
];

// Tasks that prefer local inference (privacy sensitive)
// P3-011: Now based on UNIFIED_TASK_CONFIG (only transcript-summary has preferLocal=true)
type AITask = typeof allAITasks[number];
export const localPreferredTasks: AITask[] = [
  'TRANSCRIPT_SUMMARY',  // ollama - only task with preferLocal=true
];

// Tasks that require Claude (safety-critical)
// P3-011: Now based on UNIFIED_TASK_CONFIG (all safety-critical + soap-generation)
export const claudeRequiredTasks: AITask[] = [
  'DRUG_INTERACTION',
  'PRESCRIPTION_REVIEW',
  'LAB_INTERPRETATION',
  'DIFFERENTIAL_DIAGNOSIS', // maps to 'diagnosis-support' which uses claude
  'SOAP_GENERATION',
];

// P2-005: Unified tasks that prefer local inference
export const unifiedLocalPreferredTasks: UnifiedAITask[] = [
  'transcript-summary',
];

// P2-005: Unified safety-critical tasks (Claude required)
export const unifiedSafetyCriticalTasks: UnifiedAITask[] = [
  'drug-interaction',
  'diagnosis-support',
  'prescription-review',
  'lab-interpretation',
  'soap-generation',
];
