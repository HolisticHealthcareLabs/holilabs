import {
  CAM_PRESETS,
  CAM_PRESET_IDS,
  PRE_VISIT_BRIEFING_PRESET,
  POST_VISIT_SOAP_NOTE_PRESET,
  PATIENT_HANDOUT_PRESET,
  PreVisitBriefingInputSchema,
  PostVisitSoapNoteInputSchema,
  PatientHandoutInputSchema,
  PreVisitBriefingOutputSchema,
  PostVisitSoapNoteOutputSchema,
  PatientHandoutOutputSchema,
  CamConsultResultSchema,
  filterModalitiesForPreset,
  getPreset,
  type CamPresetId,
} from '../ai-preset';
import type { CamConsultResult } from '../consult';

const PRESET_IDS = [...CAM_PRESET_IDS] as CamPresetId[];

function fixtureConsultResult(): CamConsultResult {
  return {
    matchedTags: ['chronic_pain', 'anxiety_sleep'],
    modalities: [
      {
        modalitySlug: 'acupuntura',
        displayName: 'Acupuncture',
        systemType: 'COMPLEMENTARY',
        evidenceTier: 'A',
        summary: 'Evidence for chronic pain and PONV.',
        citations: [{ source: 'Cochrane CD003281', pmid: '26522652' }],
        indicationTags: ['chronic_pain'],
        matchedTagCount: 1,
      },
      {
        modalitySlug: 'medicina-funcional',
        displayName: 'Functional Medicine',
        systemType: 'INTEGRATIVE',
        evidenceTier: 'C',
        summary: 'Systems-biology approach.',
        citations: [{ source: 'IFM 2023' }],
        indicationTags: ['fatigue_immunity'],
        matchedTagCount: 1,
      },
      {
        modalitySlug: 'homeopatia',
        displayName: 'Homeopathy',
        systemType: 'COMPLEMENTARY',
        evidenceTier: 'D',
        summary: 'Contested evidence.',
        citations: [{ source: 'NHMRC 2015' }],
        indicationTags: ['skin'],
        matchedTagCount: 1,
      },
    ],
    contraindications: [
      {
        herbalSlug: 'hypericum',
        commonName: 'St. Johns Wort',
        scientificName: 'Hypericum perforatum',
        withMedClass: 'SSRI',
        concern: 'Serotonin syndrome risk',
        mechanism: 'CYP3A4 induction + serotonergic activity',
        holdDaysPreOp: 5,
        citationPmid: '12345',
      },
    ],
    practitioners: [],
    disclaimer: 'Decision-support only.',
    ragActive: false,
    expertContributors: [],
    meta: {
      knowledgeBaseVersion: '2026-04-18-rule-based-mvp',
      generatedAt: new Date().toISOString(),
    },
  };
}

describe('CAM preset registry', () => {
  it('exposes exactly three presets', () => {
    expect(CAM_PRESET_IDS).toHaveLength(3);
    expect(Object.keys(CAM_PRESETS).sort()).toEqual([...CAM_PRESET_IDS].sort());
  });

  it.each(PRESET_IDS)('preset %s has well-formed identity', (id: CamPresetId) => {
    const preset = getPreset(id);
    expect(preset.id).toBe(id);
    expect(['clinician', 'patient']).toContain(preset.audience);
    expect(preset.purpose.length).toBeGreaterThan(20);
    expect(preset.systemPrompt.length).toBeGreaterThan(40);
    expect(preset.maxOutputTokens).toBeGreaterThan(0);
    expect(['A', 'B', 'C', 'D']).toContain(preset.minEvidenceTier);
  });

  it('getPreset throws on unknown id', () => {
    // @ts-expect-error deliberate bad input
    expect(() => getPreset('nonexistent')).toThrow(/Unknown CAM preset/);
  });

  it('audience mapping matches the intent of each preset', () => {
    expect(PRE_VISIT_BRIEFING_PRESET.audience).toBe('clinician');
    expect(POST_VISIT_SOAP_NOTE_PRESET.audience).toBe('clinician');
    expect(PATIENT_HANDOUT_PRESET.audience).toBe('patient');
  });
});

describe('CAM preset PHI contracts', () => {
  it.each(PRESET_IDS)('%s marks clinicianContext as deidentify', (id: CamPresetId) => {
    const preset = getPreset(id);
    expect(preset.phiContract.fields.clinicianContext).toBe('deidentify');
  });

  it('post-visit note marks clinicianDecisions as deidentify', () => {
    expect(
      POST_VISIT_SOAP_NOTE_PRESET.phiContract.fields.clinicianDecisions,
    ).toBe('deidentify');
  });

  it('pre-visit briefing output is NOT persistable (ephemeral clipboard)', () => {
    expect(PRE_VISIT_BRIEFING_PRESET.phiContract.outputPersistable).toBe(false);
  });

  it('post-visit SOAP note and patient handout outputs ARE persistable', () => {
    expect(POST_VISIT_SOAP_NOTE_PRESET.phiContract.outputPersistable).toBe(true);
    expect(PATIENT_HANDOUT_PRESET.phiContract.outputPersistable).toBe(true);
  });

  it.each(PRESET_IDS)(
    '%s never references forbidden raw PHI field names',
    (id: CamPresetId) => {
      const preset = getPreset(id);
      for (const [field, policy] of Object.entries(preset.phiContract.fields)) {
        expect(['safe', 'deidentify', 'blocked']).toContain(policy);
        expect(field).not.toMatch(/password|ssn|cpf|cns|mrn/i);
      }
    },
  );
});

describe('CAM preset input schemas', () => {
  const consultResult = fixtureConsultResult();

  it('pre-visit briefing accepts a minimal valid input', () => {
    const parsed = PreVisitBriefingInputSchema.parse({
      consultResult,
      locale: 'en',
      activeMedClasses: ['SSRI'],
    });
    expect(parsed.activeMedClasses).toEqual(['SSRI']);
  });

  it('pre-visit briefing rejects more than 30 med classes', () => {
    const meds = Array.from({ length: 31 }, (_, i) => `MED_${i}`);
    const result = PreVisitBriefingInputSchema.safeParse({
      consultResult,
      locale: 'en',
      activeMedClasses: meds,
    });
    expect(result.success).toBe(false);
  });

  it('pre-visit briefing rejects non-positive minutesUntilVisit', () => {
    const result = PreVisitBriefingInputSchema.safeParse({
      consultResult,
      locale: 'en',
      activeMedClasses: [],
      minutesUntilVisit: 0,
    });
    expect(result.success).toBe(false);
  });

  it('post-visit SOAP requires at least one discussed slug', () => {
    const bad = PostVisitSoapNoteInputSchema.safeParse({
      consultResult,
      locale: 'pt-BR',
      discussedSlugs: [],
    });
    expect(bad.success).toBe(false);
    const ok = PostVisitSoapNoteInputSchema.safeParse({
      consultResult,
      locale: 'pt-BR',
      discussedSlugs: ['acupuntura'],
    });
    expect(ok.success).toBe(true);
  });

  it('patient handout caps includeSlugs at 3', () => {
    const bad = PatientHandoutInputSchema.safeParse({
      consultResult,
      locale: 'es',
      includeSlugs: ['a', 'b', 'c', 'd'],
    });
    expect(bad.success).toBe(false);
  });

  it('patient handout defaults readingLevel to grade_8', () => {
    const parsed = PatientHandoutInputSchema.parse({
      consultResult,
      locale: 'es',
      includeSlugs: ['acupuntura'],
    });
    expect(parsed.readingLevel).toBe('grade_8');
  });

  it('rejects locales outside the supported set', () => {
    const result = PreVisitBriefingInputSchema.safeParse({
      consultResult,
      locale: 'fr',
      activeMedClasses: [],
    });
    expect(result.success).toBe(false);
  });

  it('clinicianContext length cap is enforced', () => {
    const result = PreVisitBriefingInputSchema.safeParse({
      consultResult,
      locale: 'en',
      activeMedClasses: [],
      clinicianContext: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe('CAM preset output schemas', () => {
  it('pre-visit briefing output caps topModalities at 3', () => {
    const bad = PreVisitBriefingOutputSchema.safeParse({
      presetId: 'pre_visit_briefing',
      topModalities: Array.from({ length: 4 }, (_, i) => ({
        modalitySlug: `m-${i}`,
        evidenceTier: 'A',
        oneLiner: 'x',
      })),
      contraindicationFlags: [],
      discussionPrompts: [],
      disclaimer: 'd',
    });
    expect(bad.success).toBe(false);
  });

  it('pre-visit briefing oneLiner length cap is enforced', () => {
    const bad = PreVisitBriefingOutputSchema.safeParse({
      presetId: 'pre_visit_briefing',
      topModalities: [
        {
          modalitySlug: 'x',
          evidenceTier: 'A',
          oneLiner: 'x'.repeat(241),
        },
      ],
      contraindicationFlags: [],
      discussionPrompts: [],
      disclaimer: 'd',
    });
    expect(bad.success).toBe(false);
  });

  it('post-visit SOAP enforces section length caps', () => {
    const bad = PostVisitSoapNoteOutputSchema.safeParse({
      presetId: 'post_visit_soap_note',
      sections: {
        subjective: 'x'.repeat(801),
        objective: '',
        assessment: '',
        plan: '',
      },
      referrals: [],
      disclaimer: 'd',
    });
    expect(bad.success).toBe(false);
  });

  it('post-visit SOAP accepts a well-formed stub', () => {
    const ok = PostVisitSoapNoteOutputSchema.safeParse({
      presetId: 'post_visit_soap_note',
      sections: {
        subjective: 'Patient reports chronic low back pain.',
        objective: '',
        assessment: 'Chronic musculoskeletal pain candidate for CAM adjunct.',
        plan: 'Discussed acupuncture; patient will self-refer.',
      },
      referrals: [
        {
          modalitySlug: 'acupuntura',
          rationale: 'Evidence tier A for chronic LBP.',
        },
      ],
      disclaimer: 'Non-autonomous advisory tool.',
    });
    expect(ok.success).toBe(true);
  });

  it('patient handout requires at least one whenToContactClinician item', () => {
    const bad = PatientHandoutOutputSchema.safeParse({
      presetId: 'patient_handout',
      title: 'Your CAM options',
      introParagraph: 'Intro.',
      modalityCards: [],
      whenToContactClinician: [],
      disclaimer: 'd',
    });
    expect(bad.success).toBe(false);
  });

  it('patient handout modalityCards capped at 3', () => {
    const bad = PatientHandoutOutputSchema.safeParse({
      presetId: 'patient_handout',
      title: 'Your CAM options',
      introParagraph: 'Intro.',
      modalityCards: Array.from({ length: 4 }, (_, i) => ({
        modalitySlug: `m-${i}`,
        plainSummary: 's',
        whatToExpect: 'e',
        safetyNotes: 'n',
      })),
      whenToContactClinician: ['call if fever'],
      disclaimer: 'd',
    });
    expect(bad.success).toBe(false);
  });
});

describe('CamConsultResultSchema', () => {
  it('accepts a well-formed fixture', () => {
    const result = CamConsultResultSchema.safeParse(fixtureConsultResult());
    expect(result.success).toBe(true);
  });

  it('rejects an unknown evidence tier', () => {
    const fx = fixtureConsultResult();
    (fx.modalities[0] as unknown as { evidenceTier: string }).evidenceTier = 'Z';
    const result = CamConsultResultSchema.safeParse(fx);
    expect(result.success).toBe(false);
  });
});

describe('filterModalitiesForPreset', () => {
  const consultResult = fixtureConsultResult();

  it('pre-visit briefing surfaces only tier C or higher', () => {
    const filtered = filterModalitiesForPreset(
      consultResult,
      PRE_VISIT_BRIEFING_PRESET,
    );
    const tiers = filtered.map((m) => m.evidenceTier);
    expect(tiers).toContain('A');
    expect(tiers).toContain('C');
    expect(tiers).not.toContain('D');
  });

  it('patient handout surfaces only tier C or higher', () => {
    const filtered = filterModalitiesForPreset(
      consultResult,
      PATIENT_HANDOUT_PRESET,
    );
    expect(filtered.every((m) => m.evidenceTier !== 'D')).toBe(true);
  });

  it('post-visit SOAP note allows any tier (clinician has seen the evidence in visit)', () => {
    const filtered = filterModalitiesForPreset(
      consultResult,
      POST_VISIT_SOAP_NOTE_PRESET,
    );
    expect(filtered).toHaveLength(consultResult.modalities.length);
  });
});

describe('CAM preset system prompts', () => {
  it('patient handout forbids SaMD-trigger vocabulary in instructions', () => {
    const prompt = PATIENT_HANDOUT_PRESET.systemPrompt.toLowerCase();
    expect(prompt).toContain('plain language');
    expect(prompt).toContain('do not use');
    for (const banned of ['diagnose', 'detect', 'prevent', 'treat', 'cure', 'predict']) {
      expect(prompt).toContain(banned);
    }
  });

  it('all prompts explicitly forbid invention of clinical facts', () => {
    for (const id of PRESET_IDS) {
      const prompt = getPreset(id).systemPrompt.toLowerCase();
      const forbidsInvention =
        prompt.includes('not invent') ||
        prompt.includes('no invention') ||
        prompt.includes('only reference') ||
        prompt.includes('use only');
      expect(forbidsInvention).toBe(true);
    }
  });
});
