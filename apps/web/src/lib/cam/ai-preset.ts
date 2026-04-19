/**
 * CAM AI preset scaffolding for doctor visits.
 *
 * These are DECLARATIVE presets only. They describe what an LLM would be
 * asked to produce and the contract each output must satisfy. No model
 * call is wired here — that integration lands after the de-identification
 * pipeline (`@holi/deid`) is confirmed in the request path.
 *
 * ANVISA RDC 657/2022 Class I constraint: LLM outputs are context-gathering
 * and documentation-assistance artefacts. They never compute clinical
 * decisions. The rule-based `runCamConsult()` engine remains the authority
 * for modality suggestions, contraindications, and practitioner matching;
 * the AI preset only reformats that deterministic output into a brief,
 * a SOAP-aligned note, or a patient handout.
 *
 * PHI safety: every preset declares a PhiContract describing which fields
 * in the input are de-identification-required vs. safe pass-through. The
 * wiring layer MUST run PHI-bearing strings through the de-id proxy
 * before the preset is dispatched to any external model.
 */
import { z } from 'zod';
import type { EvidenceTier, ModalitySuggestion } from './knowledge-base';
import type {
  CamConsultContraindication,
  CamConsultPractitioner,
  CamConsultResult,
} from './consult';

// ─── Preset identity ───────────────────────────────────────────────────────

export const CAM_PRESET_IDS = [
  'pre_visit_briefing',
  'post_visit_soap_note',
  'patient_handout',
] as const;
export type CamPresetId = (typeof CAM_PRESET_IDS)[number];

/** Audience determines register, reading level, and disclaimer wording. */
export type CamPresetAudience = 'clinician' | 'patient';

/**
 * PHI handling contract per field in a preset's input. The wiring layer
 * enforces this: fields marked `deidentify` MUST pass through `@holi/deid`
 * before hitting any external model. `blocked` fields must never leave
 * the server even after de-identification.
 */
export type PhiFieldPolicy = 'safe' | 'deidentify' | 'blocked';

export interface PhiContract {
  /** Per-field policy, keyed by dotted path in the preset input */
  fields: Record<string, PhiFieldPolicy>;
  /**
   * If true, the preset output can be stored in the patient record.
   * If false, the output is ephemeral (clinician clipboard / UI only).
   */
  outputPersistable: boolean;
}

// ─── Shared input schema ───────────────────────────────────────────────────

/**
 * The deterministic CAM consult result is the trusted input to every AI
 * preset. Presets never re-derive modalities, contraindications, or
 * practitioners — they only reformat what the engine returned.
 */
export const CamConsultResultSchema: z.ZodType<CamConsultResult> = z.object({
  matchedTags: z.array(z.string()),
  modalities: z.array(
    z.object({
      modalitySlug: z.string(),
      displayName: z.string(),
      systemType: z.enum([
        'CONVENTIONAL',
        'COMPLEMENTARY',
        'TRADITIONAL',
        'INTEGRATIVE',
      ]),
      evidenceTier: z.enum(['A', 'B', 'C', 'D']),
      summary: z.string(),
      citations: z.array(
        z.object({
          source: z.string(),
          pmid: z.string().optional(),
          doi: z.string().optional(),
        }),
      ),
      indicationTags: z.array(z.string()),
      matchedTagCount: z.number().int().nonnegative(),
    }),
  ),
  contraindications: z.array(
    z.object({
      herbalSlug: z.string(),
      commonName: z.string(),
      scientificName: z.string(),
      withMedClass: z.string(),
      concern: z.string(),
      mechanism: z.string(),
      holdDaysPreOp: z.number().int().nonnegative(),
      citationPmid: z.string().nullable(),
    }),
  ),
  practitioners: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      systemType: z.enum([
        'CONVENTIONAL',
        'COMPLEMENTARY',
        'TRADITIONAL',
        'INTEGRATIVE',
      ]),
      primarySpecialty: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      country: z.string(),
      avgRating: z.number(),
      reviewCount: z.number().int(),
      claimStatus: z.string(),
      profileUrl: z.string(),
    }),
  ),
  disclaimer: z.string(),
  ragActive: z.boolean(),
  expertContributors: z.array(z.string()),
  meta: z.object({
    knowledgeBaseVersion: z.string(),
    generatedAt: z.string(),
  }),
}) as z.ZodType<CamConsultResult>;

const LocaleSchema = z.enum(['en', 'pt', 'pt-BR', 'es']);

/** Base input shared by every preset. Preset-specific fields extend this. */
export const CamPresetBaseInputSchema = z.object({
  consultResult: CamConsultResultSchema,
  locale: LocaleSchema,
  /** Clinician note added at consult time. May contain PHI → deidentify. */
  clinicianContext: z.string().max(2000).optional(),
});
export type CamPresetBaseInput = z.infer<typeof CamPresetBaseInputSchema>;

// ─── Preset-specific input + output schemas ────────────────────────────────

export const PreVisitBriefingInputSchema = CamPresetBaseInputSchema.extend({
  /** Current active medications — class names only, not patient-specific dosing */
  activeMedClasses: z.array(z.string()).max(30),
  /** Minutes until visit — drives level of detail */
  minutesUntilVisit: z.number().int().positive().max(7 * 24 * 60).optional(),
});
export type PreVisitBriefingInput = z.infer<typeof PreVisitBriefingInputSchema>;

export const PreVisitBriefingOutputSchema = z.object({
  presetId: z.literal('pre_visit_briefing'),
  topModalities: z
    .array(
      z.object({
        modalitySlug: z.string(),
        evidenceTier: z.enum(['A', 'B', 'C', 'D']),
        oneLiner: z.string().max(240),
      }),
    )
    .max(3),
  contraindicationFlags: z
    .array(
      z.object({
        herbalSlug: z.string(),
        withMedClass: z.string(),
        flag: z.string().max(200),
      }),
    )
    .max(10),
  discussionPrompts: z.array(z.string().max(160)).max(5),
  disclaimer: z.string(),
});
export type PreVisitBriefingOutput = z.infer<typeof PreVisitBriefingOutputSchema>;

export const PostVisitSoapNoteInputSchema = CamPresetBaseInputSchema.extend({
  /** Modalities actually discussed in the visit (slugs from consultResult) */
  discussedSlugs: z.array(z.string()).min(1).max(5),
  /** Decisions or referrals recorded by the clinician — may contain PHI */
  clinicianDecisions: z.string().max(2000).optional(),
});
export type PostVisitSoapNoteInput = z.infer<typeof PostVisitSoapNoteInputSchema>;

export const PostVisitSoapNoteOutputSchema = z.object({
  presetId: z.literal('post_visit_soap_note'),
  sections: z.object({
    subjective: z.string().max(800),
    objective: z.string().max(800),
    assessment: z.string().max(800),
    plan: z.string().max(1200),
  }),
  referrals: z
    .array(
      z.object({
        practitionerId: z.string().optional(),
        modalitySlug: z.string(),
        rationale: z.string().max(240),
      }),
    )
    .max(5),
  disclaimer: z.string(),
});
export type PostVisitSoapNoteOutput = z.infer<typeof PostVisitSoapNoteOutputSchema>;

export const PatientHandoutInputSchema = CamPresetBaseInputSchema.extend({
  /** Which modalities to include on the handout */
  includeSlugs: z.array(z.string()).min(1).max(3),
  /** Target reading level — drives simplification */
  readingLevel: z.enum(['grade_6', 'grade_8', 'grade_10']).default('grade_8'),
});
export type PatientHandoutInput = z.infer<typeof PatientHandoutInputSchema>;

export const PatientHandoutOutputSchema = z.object({
  presetId: z.literal('patient_handout'),
  title: z.string().max(120),
  introParagraph: z.string().max(400),
  modalityCards: z
    .array(
      z.object({
        modalitySlug: z.string(),
        plainSummary: z.string().max(400),
        whatToExpect: z.string().max(400),
        safetyNotes: z.string().max(300),
      }),
    )
    .max(3),
  whenToContactClinician: z.array(z.string().max(200)).min(1).max(5),
  disclaimer: z.string(),
});
export type PatientHandoutOutput = z.infer<typeof PatientHandoutOutputSchema>;

// ─── Preset definition ─────────────────────────────────────────────────────

export interface CamPresetDefinition<
  TInput extends CamPresetBaseInput,
  TOutput,
> {
  readonly id: CamPresetId;
  readonly audience: CamPresetAudience;
  readonly purpose: string;
  readonly inputSchema: z.ZodTypeAny;
  readonly outputSchema: z.ZodType<TOutput>;
  readonly phiContract: PhiContract;
  readonly systemPrompt: string;
  /**
   * Maximum tokens the output budget should allow. Defensive cap — the
   * wiring layer should enforce this at the provider level too.
   */
  readonly maxOutputTokens: number;
  /** Minimum evidence tier a modality must have to be surfaced by this preset. */
  readonly minEvidenceTier: EvidenceTier;
}

const BASE_PHI_FIELDS: Record<string, PhiFieldPolicy> = {
  'consultResult.practitioners[].name': 'safe',
  'consultResult.practitioners[].city': 'safe',
  'consultResult.matchedTags': 'safe',
  'consultResult.modalities': 'safe',
  'consultResult.contraindications': 'safe',
  locale: 'safe',
  clinicianContext: 'deidentify',
};

export const PRE_VISIT_BRIEFING_PRESET: CamPresetDefinition<
  PreVisitBriefingInput,
  PreVisitBriefingOutput
> = {
  id: 'pre_visit_briefing',
  audience: 'clinician',
  purpose:
    'Summarize the deterministic CAM consult result into a scannable pre-visit briefing for the attending clinician.',
  inputSchema: PreVisitBriefingInputSchema,
  outputSchema: PreVisitBriefingOutputSchema,
  phiContract: {
    fields: {
      ...BASE_PHI_FIELDS,
      activeMedClasses: 'safe',
      minutesUntilVisit: 'safe',
    },
    outputPersistable: false,
  },
  systemPrompt:
    'You are drafting a pre-visit briefing for a clinician. You MUST NOT invent modalities, evidence tiers, or contraindications. Use only the items present in consultResult. Keep each one-liner under 240 characters. Do not speculate about diagnosis. Preserve the disclaimer verbatim.',
  maxOutputTokens: 600,
  minEvidenceTier: 'C',
};

export const POST_VISIT_SOAP_NOTE_PRESET: CamPresetDefinition<
  PostVisitSoapNoteInput,
  PostVisitSoapNoteOutput
> = {
  id: 'post_visit_soap_note',
  audience: 'clinician',
  purpose:
    'Draft a SOAP-structured documentation stub for the CAM portion of a completed visit. The clinician edits before signing.',
  inputSchema: PostVisitSoapNoteInputSchema,
  outputSchema: PostVisitSoapNoteOutputSchema,
  phiContract: {
    fields: {
      ...BASE_PHI_FIELDS,
      discussedSlugs: 'safe',
      clinicianDecisions: 'deidentify',
    },
    outputPersistable: true,
  },
  systemPrompt:
    'You are drafting a SOAP note stub for the CAM discussion of a visit. Only reference modalities in discussedSlugs. Do not add diagnoses. Do not add medications. Pull objective findings only from clinicianDecisions — if none, leave Objective empty. The clinician will edit and sign.',
  maxOutputTokens: 900,
  minEvidenceTier: 'D',
};

export const PATIENT_HANDOUT_PRESET: CamPresetDefinition<
  PatientHandoutInput,
  PatientHandoutOutput
> = {
  id: 'patient_handout',
  audience: 'patient',
  purpose:
    'Produce a plain-language handout describing up to three CAM modalities the clinician recommended, at the requested reading level.',
  inputSchema: PatientHandoutInputSchema,
  outputSchema: PatientHandoutOutputSchema,
  phiContract: {
    fields: {
      ...BASE_PHI_FIELDS,
      includeSlugs: 'safe',
      readingLevel: 'safe',
    },
    outputPersistable: true,
  },
  systemPrompt:
    'You are writing a patient handout. Use plain language at the requested reading level. Do NOT use the words: diagnose, detect, prevent, treat, cure, predict. Describe what to expect and what to discuss with the clinician. Every safety note must be grounded in the modality summary or contraindications provided — no invention.',
  maxOutputTokens: 1200,
  minEvidenceTier: 'C',
};

export const CAM_PRESETS: Readonly<Record<CamPresetId, CamPresetDefinition<any, any>>> =
  Object.freeze({
    pre_visit_briefing: PRE_VISIT_BRIEFING_PRESET,
    post_visit_soap_note: POST_VISIT_SOAP_NOTE_PRESET,
    patient_handout: PATIENT_HANDOUT_PRESET,
  });

export function getPreset(id: CamPresetId): CamPresetDefinition<any, any> {
  const preset = CAM_PRESETS[id];
  if (!preset) {
    throw new Error(`Unknown CAM preset: ${id}`);
  }
  return preset;
}

/**
 * Filter a consult result down to the modalities a given preset should
 * surface, given its `minEvidenceTier`. Deterministic — no LLM involved.
 */
export function filterModalitiesForPreset(
  result: CamConsultResult,
  preset: CamPresetDefinition<any, any>,
): Array<ModalitySuggestion & { matchedTagCount: number }> {
  const order: Record<EvidenceTier, number> = { A: 4, B: 3, C: 2, D: 1 };
  const floor = order[preset.minEvidenceTier];
  return result.modalities.filter((m) => order[m.evidenceTier] >= floor);
}
