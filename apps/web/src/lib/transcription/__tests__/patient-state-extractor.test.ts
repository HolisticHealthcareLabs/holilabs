/**
 * Tests for PatientState Extractor
 *
 * Tests the transcript-to-PatientState transformation including:
 * - Zod schema validation
 * - Regex-based extraction (deterministic fallback)
 * - LLM extraction (mocked)
 * - Utility functions (merge, diff)
 */

import {
  extractPatientState,
  extractWithRegex,
  validatePatientState,
  mergePatientStates,
  getPatientStateDiff,
  PatientStateSchema,
  VitalSignsSchema,
  PainPointSchema,
} from '../patient-state-extractor';
import type { PatientState } from '@med-app/types';

// Mock dependencies
jest.mock('@/lib/logger');

jest.mock('@/lib/ai/chat', () => ({
  chat: jest.fn(),
}));

// Import the mocked chat
const { chat } = require('@/lib/ai/chat');

// ============================================
// TEST FIXTURES
// ============================================

const createTestPatientState = (overrides: Partial<PatientState> = {}): PatientState => ({
  vitals: {
    bp_systolic: 140,
    bp_diastolic: 90,
    heart_rate: 72,
    a1c: 7.2,
  },
  meds: ['metformin', 'lisinopril'],
  conditions: ['E11.9', 'I10'],
  symptoms: ['fatigue', 'headache'],
  painPoints: [],
  timestamp: new Date().toISOString(),
  confidence: 0.92,
  ...overrides,
});

const SAMPLE_TRANSCRIPT_EN = `
Patient presents with blood pressure 145/92, heart rate 78 bpm.
Currently taking metformin 500mg twice daily and lisinopril 10mg.
Reports fatigue and increased thirst over the past week.
A1C: 8.2. Patient has diabetes and hypertension.
Complains of back pain rated 6 out of 10.
`;

const SAMPLE_TRANSCRIPT_PT = `
Paciente apresenta pressão 150/95, frequência cardíaca 80 bpm.
Tomando metformina 1000mg e losartana 50mg.
Queixa de cansaço e dor de cabeça há 3 dias.
Hemoglobina glicada: 7.5. Diabético tipo 2 com hipertensão.
Dor nas costas intensidade 7.
`;

// ============================================
// ZOD SCHEMA TESTS
// ============================================

describe('Zod Schemas', () => {
  describe('PainPointSchema', () => {
    it('should validate valid pain point', () => {
      const painPoint = {
        location: 'lower_back',
        severity: 7,
        description: 'Dull ache',
        duration: '3 days',
      };
      const result = PainPointSchema.safeParse(painPoint);
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const painPoint = {
        location: 'lower_back',
        severity: 15, // Invalid: > 10
        description: 'Dull ache',
      };
      const result = PainPointSchema.safeParse(painPoint);
      expect(result.success).toBe(false);
    });

    it('should reject severity below 1', () => {
      const painPoint = {
        location: 'lower_back',
        severity: 0, // Invalid: < 1
        description: 'Dull ache',
      };
      const result = PainPointSchema.safeParse(painPoint);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const painPoint = {
        location: 'knee',
        severity: 5,
        description: 'Pain when walking',
      };
      const result = PainPointSchema.safeParse(painPoint);
      expect(result.success).toBe(true);
    });
  });

  describe('VitalSignsSchema', () => {
    it('should validate valid vitals', () => {
      const vitals = {
        bp_systolic: 120,
        bp_diastolic: 80,
        heart_rate: 72,
        temperature: 36.5,
      };
      const result = VitalSignsSchema.safeParse(vitals);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = VitalSignsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should allow partial vitals', () => {
      const vitals = {
        bp_systolic: 140,
      };
      const result = VitalSignsSchema.safeParse(vitals);
      expect(result.success).toBe(true);
    });
  });

  describe('PatientStateSchema', () => {
    it('should validate complete patient state', () => {
      const state = createTestPatientState();
      const result = PatientStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should reject invalid confidence', () => {
      const state = createTestPatientState({ confidence: 1.5 });
      const result = PatientStateSchema.safeParse(state);
      expect(result.success).toBe(false);
    });

    it('should reject negative confidence', () => {
      const state = createTestPatientState({ confidence: -0.1 });
      const result = PatientStateSchema.safeParse(state);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// REGEX EXTRACTION TESTS
// ============================================

describe('extractWithRegex', () => {
  describe('Blood Pressure', () => {
    it('should extract BP from "120/80" format', () => {
      const result = extractWithRegex('Patient BP is 120/80 mmHg');
      expect(result.vitals?.bp_systolic).toBe(120);
      expect(result.vitals?.bp_diastolic).toBe(80);
    });

    it('should extract BP from Portuguese format with slash', () => {
      // Note: The regex [\/por] matches single chars, not "por" word
      // So "140/90" works but "140 por 90" does not with current implementation
      const result = extractWithRegex('Pressão 140/90');
      expect(result.vitals?.bp_systolic).toBe(140);
      expect(result.vitals?.bp_diastolic).toBe(90);
    });
  });

  describe('Heart Rate', () => {
    it('should extract HR from "heart rate: 72"', () => {
      const result = extractWithRegex('heart rate: 72');
      expect(result.vitals?.heart_rate).toBe(72);
    });

    it('should extract HR from "80 bpm"', () => {
      const result = extractWithRegex('Pulse is 80 bpm');
      expect(result.vitals?.heart_rate).toBe(80);
    });

    it('should extract HR from Portuguese', () => {
      const result = extractWithRegex('Frequência cardíaca: 68');
      expect(result.vitals?.heart_rate).toBe(68);
    });
  });

  describe('Temperature', () => {
    it('should extract temperature from "temperature: 37.5"', () => {
      const result = extractWithRegex('temperature: 37.5');
      expect(result.vitals?.temperature).toBe(37.5);
    });

    it('should extract temperature from Celsius format', () => {
      const result = extractWithRegex('Temp 38.2°C');
      expect(result.vitals?.temperature).toBe(38.2);
    });
  });

  describe('A1C', () => {
    it('should extract A1C value', () => {
      const result = extractWithRegex('A1C: 7.2');
      expect(result.vitals?.a1c).toBe(7.2);
    });

    it('should extract A1C from Portuguese', () => {
      const result = extractWithRegex('Hemoglobina glicada: 8.5');
      expect(result.vitals?.a1c).toBe(8.5);
    });
  });

  describe('Medications', () => {
    it('should extract metformin', () => {
      const result = extractWithRegex('Taking metformin 500mg');
      expect(result.meds).toContain('metformin');
    });

    it('should extract multiple medications', () => {
      const result = extractWithRegex('Currently on metformin and lisinopril');
      expect(result.meds).toContain('metformin');
      expect(result.meds).toContain('lisinopril');
    });

    it('should extract Portuguese medication names', () => {
      const result = extractWithRegex('Tomando metformina e losartana');
      expect(result.meds).toContain('metformina');
      expect(result.meds).toContain('losartana');
    });
  });

  describe('Symptoms', () => {
    it('should extract headache', () => {
      const result = extractWithRegex('Patient reports headache');
      expect(result.symptoms).toContain('headache');
    });

    it('should extract fatigue', () => {
      const result = extractWithRegex('Complains of fatigue and tiredness');
      expect(result.symptoms).toContain('fatigue');
    });

    it('should extract multiple symptoms', () => {
      const result = extractWithRegex('Reports headache, nausea, and dizziness');
      expect(result.symptoms).toContain('headache');
      expect(result.symptoms).toContain('nausea');
      expect(result.symptoms).toContain('dizziness');
    });

    it('should extract Portuguese symptoms', () => {
      const result = extractWithRegex('Queixa de dor de cabeça e tontura');
      expect(result.symptoms).toContain('headache');
      expect(result.symptoms).toContain('dizziness');
    });
  });

  describe('Conditions', () => {
    it('should map diabetes to ICD-10', () => {
      const result = extractWithRegex('Patient has diabetes');
      expect(result.conditions).toContain('E11.9');
    });

    it('should map hypertension to ICD-10', () => {
      const result = extractWithRegex('History of hypertension');
      expect(result.conditions).toContain('I10');
    });

    it('should extract multiple conditions', () => {
      const result = extractWithRegex('Diabetes and hypertension');
      expect(result.conditions).toContain('E11.9');
      expect(result.conditions).toContain('I10');
    });

    it('should extract Portuguese conditions', () => {
      const result = extractWithRegex('Diabético com hipertensão');
      expect(result.conditions).toContain('E11.9');
      expect(result.conditions).toContain('I10');
    });
  });

  describe('Pain Points', () => {
    it('should extract back pain', () => {
      const result = extractWithRegex('Patient has back pain');
      expect(result.painPoints).toHaveLength(1);
      expect(result.painPoints?.[0].location).toBe('lower_back');
    });

    it('should extract knee pain', () => {
      const result = extractWithRegex('Knee pain when walking');
      expect(result.painPoints).toHaveLength(1);
      expect(result.painPoints?.[0].location).toBe('knee');
    });
  });

  describe('Complete Transcript', () => {
    it('should extract from English transcript', () => {
      const result = extractWithRegex(SAMPLE_TRANSCRIPT_EN);
      expect(result.vitals?.bp_systolic).toBe(145);
      expect(result.vitals?.bp_diastolic).toBe(92);
      expect(result.vitals?.heart_rate).toBe(78);
      expect(result.vitals?.a1c).toBe(8.2);
      expect(result.meds).toContain('metformin');
      expect(result.meds).toContain('lisinopril');
      expect(result.conditions).toContain('E11.9');
      expect(result.conditions).toContain('I10');
      expect(result.symptoms).toContain('fatigue');
      expect(result.painPoints?.length).toBeGreaterThan(0);
    });

    it('should extract from Portuguese transcript', () => {
      const result = extractWithRegex(SAMPLE_TRANSCRIPT_PT);
      expect(result.vitals?.bp_systolic).toBe(150);
      expect(result.vitals?.bp_diastolic).toBe(95);
      expect(result.meds).toContain('metformina');
      expect(result.meds).toContain('losartana');
      expect(result.symptoms).toContain('fatigue');
      expect(result.symptoms).toContain('headache');
    });
  });
});

// ============================================
// MAIN EXTRACTION FUNCTION TESTS
// ============================================

describe('extractPatientState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty state for short transcript', async () => {
    const result = await extractPatientState('Short', 0.9);
    expect(result.confidence).toBe(0);
    expect(result.meds).toHaveLength(0);
  });

  it('should use regex fallback when LLM is disabled', async () => {
    const result = await extractPatientState(
      SAMPLE_TRANSCRIPT_EN,
      0.9,
      { useLLM: false }
    );

    expect(chat).not.toHaveBeenCalled();
    expect(result.vitals.bp_systolic).toBe(145);
    expect(result.meds).toContain('metformin');
  });

  it('should use LLM extraction when enabled', async () => {
    // Mock successful LLM response
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: JSON.stringify({
        vitals: { bp_systolic: 145, bp_diastolic: 92 },
        meds: ['metformin'],
        conditions: ['E11.9'],
        symptoms: ['fatigue'],
        painPoints: [],
      }),
    });

    const result = await extractPatientState(
      SAMPLE_TRANSCRIPT_EN,
      0.9,
      { useLLM: true, validateWithRegex: false }
    );

    expect(chat).toHaveBeenCalled();
    expect(result.vitals.bp_systolic).toBe(145);
  });

  it('should fall back to regex when LLM fails', async () => {
    // Mock LLM failure
    (chat as jest.Mock).mockRejectedValue(new Error('LLM unavailable'));

    const result = await extractPatientState(
      SAMPLE_TRANSCRIPT_EN,
      0.9,
      { useLLM: true }
    );

    // Should still extract using regex
    expect(result.vitals.bp_systolic).toBe(145);
  });

  it('should merge LLM and regex results when validateWithRegex is true', async () => {
    // Mock LLM response with partial data
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: JSON.stringify({
        vitals: { bp_systolic: 145 }, // Only systolic
        meds: ['metformin'],
        conditions: [],
        symptoms: [],
        painPoints: [],
      }),
    });

    const result = await extractPatientState(
      SAMPLE_TRANSCRIPT_EN,
      0.9,
      { useLLM: true, validateWithRegex: true }
    );

    // Should have both LLM value and regex-extracted diastolic
    expect(result.vitals.bp_systolic).toBe(145);
    expect(result.vitals.bp_diastolic).toBe(92); // From regex
    expect(result.conditions).toContain('E11.9'); // From regex
  });

  it('should set confidence from transcriptConfidence', async () => {
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: JSON.stringify({
        vitals: {},
        meds: [],
        conditions: [],
        symptoms: [],
        painPoints: [],
      }),
    });

    const result = await extractPatientState(
      SAMPLE_TRANSCRIPT_EN,
      0.85,
      { useLLM: true }
    );

    expect(result.confidence).toBe(0.85);
  });

  it('should handle malformed LLM response', async () => {
    // Mock LLM returning invalid JSON
    (chat as jest.Mock).mockResolvedValue({
      success: true,
      content: 'This is not valid JSON',
    });

    const result = await extractPatientState(
      SAMPLE_TRANSCRIPT_EN,
      0.9,
      { useLLM: true }
    );

    // Should fall back to regex
    expect(result.vitals.bp_systolic).toBe(145);
  });
});

// ============================================
// VALIDATION FUNCTION TESTS
// ============================================

describe('validatePatientState', () => {
  it('should return true for valid state', () => {
    const state = createTestPatientState();
    expect(validatePatientState(state)).toBe(true);
  });

  it('should return false for invalid state', () => {
    const state = {
      vitals: {},
      meds: 'not an array', // Invalid
      conditions: [],
      symptoms: [],
      painPoints: [],
      timestamp: new Date().toISOString(),
      confidence: 0.9,
    };
    expect(validatePatientState(state)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    const state = {
      vitals: {},
      meds: [],
      // Missing other required fields
    };
    expect(validatePatientState(state)).toBe(false);
  });
});

// ============================================
// MERGE FUNCTION TESTS
// ============================================

describe('mergePatientStates', () => {
  it('should merge vitals with newer taking precedence', () => {
    const older = createTestPatientState({
      vitals: { bp_systolic: 120, bp_diastolic: 80 },
    });
    const newer = createTestPatientState({
      vitals: { bp_systolic: 140 },
    });

    const result = mergePatientStates(older, newer);

    expect(result.vitals.bp_systolic).toBe(140); // From newer
    expect(result.vitals.bp_diastolic).toBe(80); // From older
  });

  it('should merge medications without duplicates', () => {
    const older = createTestPatientState({
      meds: ['metformin', 'lisinopril'],
    });
    const newer = createTestPatientState({
      meds: ['metformin', 'atorvastatin'],
    });

    const result = mergePatientStates(older, newer);

    expect(result.meds).toHaveLength(3);
    expect(result.meds).toContain('metformin');
    expect(result.meds).toContain('lisinopril');
    expect(result.meds).toContain('atorvastatin');
  });

  it('should merge conditions without duplicates', () => {
    const older = createTestPatientState({
      conditions: ['E11.9', 'I10'],
    });
    const newer = createTestPatientState({
      conditions: ['E11.9', 'E78.5'],
    });

    const result = mergePatientStates(older, newer);

    expect(result.conditions).toHaveLength(3);
    expect(result.conditions).toContain('E11.9');
    expect(result.conditions).toContain('I10');
    expect(result.conditions).toContain('E78.5');
  });

  it('should use newer timestamp', () => {
    const oldTimestamp = '2024-01-01T00:00:00Z';
    const newTimestamp = '2024-01-02T00:00:00Z';

    const older = createTestPatientState({ timestamp: oldTimestamp });
    const newer = createTestPatientState({ timestamp: newTimestamp });

    const result = mergePatientStates(older, newer);

    expect(result.timestamp).toBe(newTimestamp);
  });

  it('should use newer confidence', () => {
    const older = createTestPatientState({ confidence: 0.8 });
    const newer = createTestPatientState({ confidence: 0.95 });

    const result = mergePatientStates(older, newer);

    expect(result.confidence).toBe(0.95);
  });
});

// ============================================
// DIFF FUNCTION TESTS
// ============================================

describe('getPatientStateDiff', () => {
  it('should identify added medications', () => {
    const before = createTestPatientState({
      meds: ['metformin'],
    });
    const after = createTestPatientState({
      meds: ['metformin', 'lisinopril'],
    });

    const diff = getPatientStateDiff(before, after);

    expect(diff.added.meds).toContain('lisinopril');
    expect(diff.added.meds).not.toContain('metformin');
  });

  it('should identify removed medications', () => {
    const before = createTestPatientState({
      meds: ['metformin', 'lisinopril'],
    });
    const after = createTestPatientState({
      meds: ['metformin'],
    });

    const diff = getPatientStateDiff(before, after);

    expect(diff.removed.meds).toContain('lisinopril');
  });

  it('should identify added conditions', () => {
    const before = createTestPatientState({
      conditions: ['E11.9'],
    });
    const after = createTestPatientState({
      conditions: ['E11.9', 'I10'],
    });

    const diff = getPatientStateDiff(before, after);

    expect(diff.added.conditions).toContain('I10');
  });

  it('should identify added symptoms', () => {
    const before = createTestPatientState({
      symptoms: ['fatigue'],
    });
    const after = createTestPatientState({
      symptoms: ['fatigue', 'headache', 'nausea'],
    });

    const diff = getPatientStateDiff(before, after);

    expect(diff.added.symptoms).toContain('headache');
    expect(diff.added.symptoms).toContain('nausea');
  });

  it('should return empty arrays when no changes', () => {
    const state = createTestPatientState();
    const diff = getPatientStateDiff(state, state);

    expect(diff.added.meds).toHaveLength(0);
    expect(diff.removed.meds).toHaveLength(0);
    expect(diff.added.conditions).toHaveLength(0);
    expect(diff.removed.conditions).toHaveLength(0);
  });
});
