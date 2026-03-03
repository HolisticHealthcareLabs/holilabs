/**
 * Unit tests for prescription-extractor.ts
 *
 * All Gemini API calls are mocked — no real network requests.
 *
 * NOTE: jest.config.js has resetMocks: true, which resets all mock
 * implementations before each test. Therefore beforeEach must re-establish
 * the full mock chain (GoogleGenerativeAI → getGenerativeModel → generateContent).
 */

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
  SchemaType: {
    ARRAY: 'ARRAY', OBJECT: 'OBJECT',
    STRING: 'STRING', NUMBER: 'NUMBER',
  },
}));

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Shared mock refs — rebuilt per test in beforeEach
let mockGenerateContent: jest.Mock;

const VALID_APIXABAN_RESPONSE = JSON.stringify([
  { name: 'apixaban', dose: '5mg', frequency: 'BID', route: 'oral', quantity: 30 },
]);

const AF_SOAP_NOTE = `
Assessment: Atrial fibrillation, paroxysmal (I48.0).
Plan: Initiate apixaban 5mg BID. Supply 30 tablets. No TUSS code documented.
`;

// Re-establish mock chain after resetMocks: true wipes implementations
function setupMockChain(generateImpl?: () => any) {
  mockGenerateContent = jest.fn();
  if (generateImpl) {
    mockGenerateContent.mockImplementation(generateImpl);
  }
  const mockGetGenerativeModel = jest.fn().mockReturnValue({ generateContent: mockGenerateContent });
  (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }));
  return { mockGetGenerativeModel };
}

describe('extractMedicationsFromNote', () => {
  const originalKey = process.env.GOOGLE_AI_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-api-key-abc123';
  });

  afterEach(() => {
    process.env.GOOGLE_AI_API_KEY = originalKey;
  });

  // ── Normal extraction ────────────────────────────────────────────────────────

  test('extracts apixaban from AF SOAP note correctly', async () => {
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => VALID_APIXABAN_RESPONSE } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote(AF_SOAP_NOTE);

    expect(result.medications).toHaveLength(1);
    expect(result.medications[0].name).toBe('apixaban');
    expect(result.medications[0].dose).toBe('5mg');
    expect(result.medications[0].frequency).toBe('BID');
    expect(result.medications[0].quantity).toBe(30);
    expect(result.medications[0].tussCode).toBeUndefined();
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.extractionTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('includes multiple medications when SOAP note has several', async () => {
    const multiMedResponse = JSON.stringify([
      { name: 'metformin', dose: '850mg', frequency: '2x/dia' },
      { name: 'lisinopril', dose: '10mg', frequency: '1x/dia' },
    ]);
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => multiMedResponse } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote('Plan: continue metformin 850mg BID, add lisinopril 10mg daily');

    expect(result.medications).toHaveLength(2);
    expect(result.medications[0].name).toBe('metformin');
    expect(result.medications[1].name).toBe('lisinopril');
  });

  // ── Hallucinated TUSS code pass-through ─────────────────────────────────────

  test('passes through hallucinated TUSS code (FIN-002 will catch it downstream)', async () => {
    const hallucinatedTussResponse = JSON.stringify([
      { name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: '00000000' },
    ]);
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => hallucinatedTussResponse } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote('Plan: Apixaban 5mg BID, TUSS 00000000');

    expect(result.medications[0].tussCode).toBe('00000000');
  });

  // ── Empty / null extraction ──────────────────────────────────────────────────

  test('returns empty array when Gemini returns empty JSON array', async () => {
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => '[]' } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote('Subjective: patient feels fine. No new medications.');

    expect(result.medications).toHaveLength(0);
  });

  test('returns empty array when Gemini returns malformed JSON', async () => {
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => 'not valid json {{' } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote('some note');

    expect(result.medications).toHaveLength(0);
    expect(result.extractionTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('returns empty array when Gemini returns non-array JSON', async () => {
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => '{"name":"apixaban"}' } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote('some note');

    expect(result.medications).toHaveLength(0);
  });

  // ── API failure handling ─────────────────────────────────────────────────────

  test('returns empty array (does not throw) on API network error', async () => {
    setupMockChain(() => Promise.reject(new Error('Network timeout')));

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote(AF_SOAP_NOTE);

    expect(result.medications).toHaveLength(0);
    expect(result.model).toBe('gemini-2.5-flash');
  });

  test('returns empty array on Gemini API 429 rate limit', async () => {
    setupMockChain(() =>
      Promise.reject(new Error('429 Resource has been exhausted'))
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote(AF_SOAP_NOTE);

    expect(result.medications).toHaveLength(0);
  });

  // ── Missing API key ──────────────────────────────────────────────────────────

  test('throws config error when GOOGLE_AI_API_KEY is not set', async () => {
    setupMockChain(); // no implementation needed — won't be reached
    delete process.env.GOOGLE_AI_API_KEY;

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    await expect(extractMedicationsFromNote(AF_SOAP_NOTE)).rejects.toThrow(
      'GOOGLE_AI_API_KEY is not configured'
    );
  });

  // ── Injection safety ────────────────────────────────────────────────────────

  test('passes soapNote as a separate Part — system prompt not contaminated', async () => {
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => VALID_APIXABAN_RESPONSE } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    await extractMedicationsFromNote('some sensitive note');

    const callArgs = mockGenerateContent.mock.calls[0][0] as any;
    const parts = callArgs.contents[0].parts;

    expect(parts).toHaveLength(2);
    expect(parts[0].text).toContain('Extract every medication'); // system prompt
    expect(parts[1].text).toContain('some sensitive note');       // note is separate
    expect(parts[0].text).not.toContain('some sensitive note');   // not in system prompt
  });

  test('uses gemini-2.5-flash model', async () => {
    setupMockChain(() =>
      Promise.resolve({ response: { text: () => '[]' } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    const result = await extractMedicationsFromNote('note');

    expect(result.model).toBe('gemini-2.5-flash');
  });

  test('requests JSON response with structured responseSchema', async () => {
    const { mockGetGenerativeModel } = setupMockChain(() =>
      Promise.resolve({ response: { text: () => '[]' } })
    );

    const { extractMedicationsFromNote } = require('../prescription-extractor');
    await extractMedicationsFromNote('note');

    const modelConfig = mockGetGenerativeModel.mock.calls[0][0] as any;
    expect(modelConfig.generationConfig.responseMimeType).toBe('application/json');
    expect(modelConfig.generationConfig.responseSchema).toBeDefined();
  });
});
