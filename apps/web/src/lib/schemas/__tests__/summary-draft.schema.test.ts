/**
 * CDSS V3 - Summary Draft Schema Tests
 *
 * Verifies that Zod validation catches invalid LLM output.
 * This is critical for preventing hallucinated formats from crashing the frontend.
 */

import { ZodError } from 'zod';
import { SummaryDraftSchema, type SummaryDraft } from '../summary-draft.schema';

describe('SummaryDraftSchema', () => {
  // Valid example that matches expected LLM output
  const validDraft: SummaryDraft = {
    chiefComplaint: {
      text: 'Patient presents with chest pain for 3 days',
      confidence: 0.9,
      approved: false,
    },
    assessment: {
      text: 'Likely musculoskeletal chest pain, low cardiac risk',
      differentials: [
        { diagnosis: 'Musculoskeletal chest pain', likelihood: 'high', icdCode: 'R07.89' },
        { diagnosis: 'Costochondritis', likelihood: 'medium' },
      ],
      confidence: 0.85,
      approved: false,
    },
    plan: {
      medications: [
        { name: 'Ibuprofen', dosage: '400mg', frequency: 'TID', duration: '7 days' },
      ],
      labs: ['Lipid panel', 'CBC'],
      imaging: ['Chest X-ray if symptoms persist'],
      referrals: [],
      instructions: 'Apply heat/ice, avoid heavy lifting. Return if pain worsens or new symptoms.',
      confidence: 0.88,
      approved: false,
    },
    prevention: {
      screeningsAddressed: ['Blood pressure checked'],
      nextScreenings: [{ name: 'Colonoscopy', dueDate: '2026-06' }],
      approved: false,
    },
    followUp: {
      interval: '2 weeks',
      reason: 'Re-evaluate if symptoms persist',
      approved: false,
    },
  };

  it('accepts valid LLM output', () => {
    const result = SummaryDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it('rejects markdown table output (common LLM hallucination)', () => {
    const markdownTable = `
| Section | Content |
|---------|---------|
| Chief Complaint | Chest pain |
| Assessment | Likely musculoskeletal |
    `;

    const result = SummaryDraftSchema.safeParse(markdownTable);
    expect(result.success).toBe(false);
  });

  it('rejects plain text output', () => {
    const plainText = 'The patient came in with chest pain. I think it is musculoskeletal.';

    const result = SummaryDraftSchema.safeParse(plainText);
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = SummaryDraftSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects undefined', () => {
    const result = SummaryDraftSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it('rejects empty object', () => {
    const result = SummaryDraftSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects missing required field (chiefComplaint)', () => {
    const { chiefComplaint, ...rest } = validDraft;
    const result = SummaryDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field (assessment)', () => {
    const { assessment, ...rest } = validDraft;
    const result = SummaryDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field (plan)', () => {
    const { plan, ...rest } = validDraft;
    const result = SummaryDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field (prevention)', () => {
    const { prevention, ...rest } = validDraft;
    const result = SummaryDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field (followUp)', () => {
    const { followUp, ...rest } = validDraft;
    const result = SummaryDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid confidence score (above 1)', () => {
    const invalid = {
      ...validDraft,
      chiefComplaint: {
        ...validDraft.chiefComplaint,
        confidence: 1.5, // Invalid: must be 0-1
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid confidence score (below 0)', () => {
    const invalid = {
      ...validDraft,
      assessment: {
        ...validDraft.assessment,
        confidence: -0.1, // Invalid: must be 0-1
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid differential likelihood', () => {
    const invalid = {
      ...validDraft,
      assessment: {
        ...validDraft.assessment,
        differentials: [
          { diagnosis: 'Test', likelihood: 'very high' as any }, // Invalid enum
        ],
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects too many differentials (max 5)', () => {
    const invalid = {
      ...validDraft,
      assessment: {
        ...validDraft.assessment,
        differentials: Array(6).fill({ diagnosis: 'Test', likelihood: 'low' }),
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects chiefComplaint text exceeding 500 characters', () => {
    const invalid = {
      ...validDraft,
      chiefComplaint: {
        ...validDraft.chiefComplaint,
        text: 'x'.repeat(501), // Exceeds 500 char limit
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects assessment text exceeding 2000 characters', () => {
    const invalid = {
      ...validDraft,
      assessment: {
        ...validDraft.assessment,
        text: 'x'.repeat(2001), // Exceeds 2000 char limit
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects plan instructions exceeding 1000 characters', () => {
    const invalid = {
      ...validDraft,
      plan: {
        ...validDraft.plan,
        instructions: 'x'.repeat(1001), // Exceeds 1000 char limit
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects followUp reason exceeding 200 characters', () => {
    const invalid = {
      ...validDraft,
      followUp: {
        ...validDraft.followUp,
        reason: 'x'.repeat(201), // Exceeds 200 char limit
      },
    };
    const result = SummaryDraftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('throws ZodError when using parse() on invalid data', () => {
    expect(() => {
      SummaryDraftSchema.parse({ invalid: 'data' });
    }).toThrow(ZodError);
  });

  it('defaults empty arrays correctly', () => {
    const minimal = {
      chiefComplaint: { text: 'Test', confidence: 0.5, approved: false },
      assessment: { text: 'Test', differentials: [], confidence: 0.5, approved: false },
      plan: { instructions: 'Test', confidence: 0.5, approved: false },
      prevention: { approved: false },
      followUp: { interval: '1 week', reason: 'Test', approved: false },
    };

    const result = SummaryDraftSchema.safeParse(minimal);
    expect(result.success).toBe(true);

    if (result.success) {
      // Verify defaults are applied
      expect(result.data.plan.medications).toEqual([]);
      expect(result.data.plan.labs).toEqual([]);
      expect(result.data.plan.imaging).toEqual([]);
      expect(result.data.plan.referrals).toEqual([]);
      expect(result.data.prevention.screeningsAddressed).toEqual([]);
      expect(result.data.prevention.nextScreenings).toEqual([]);
    }
  });

  it('parses JSON response correctly', () => {
    // Simulate receiving JSON string from LLM
    const jsonString = JSON.stringify(validDraft);
    const parsed = JSON.parse(jsonString);

    const result = SummaryDraftSchema.safeParse(parsed);
    expect(result.success).toBe(true);
  });

  it('handles wrapped JSON in markdown code block', () => {
    // LLMs sometimes wrap JSON in markdown code blocks
    const wrappedJson = '```json\n' + JSON.stringify(validDraft) + '\n```';

    // Extract JSON from markdown
    const jsonMatch = wrappedJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : wrappedJson;
    const parsed = JSON.parse(jsonStr);

    const result = SummaryDraftSchema.safeParse(parsed);
    expect(result.success).toBe(true);
  });
});
