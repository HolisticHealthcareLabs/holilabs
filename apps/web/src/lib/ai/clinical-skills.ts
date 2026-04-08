/**
 * Clinical Skills — Built-in Definitions & Treatment Approach Directives
 *
 * Skills are configurable lenses that shape how the AI co-pilot responds
 * per clinical domain. Each clinician personalizes their own skill weights,
 * treatment philosophy (MBE vs PICs), and custom instructions.
 *
 * Treatment terminology follows Brazil's PNPIC (Politica Nacional de
 * Praticas Integrativas e Complementares) — CFM-recognized, non-divisive.
 */

import type { SkillCategory, TreatmentApproachPreset } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────

export interface BuiltinSkillDefinition {
    slug: string;
    name: string;
    namePtBr: string;
    nameEn: string;
    description: string;
    icon: string;
    color: string;
    category: SkillCategory;
    sortOrder: number;
    supportsTreatmentApproach: boolean;
    toolCategories: string[];
    defaultSubOptions: Record<string, boolean> | null;
    skillPromptSuffix: string;
}

export interface ResolvedSkillConfig {
    slug: string;
    name: string;
    icon: string;
    color: string;
    category: SkillCategory;
    priority: number;
    enabled: boolean;
    treatmentApproach: TreatmentApproachPreset | null;
    customInstructions: string | null;
    subOptions: Record<string, boolean> | null;
    toolCategories: string[];
    skillPromptSuffix: string;
}

// ── Built-in Skill Definitions ───────────────────────────────────────

export const BUILTIN_SKILL_DEFINITIONS: BuiltinSkillDefinition[] = [
    {
        slug: 'differential-dx',
        name: 'Diagn\u00f3stico Diferencial',
        namePtBr: 'Diagn\u00f3stico Diferencial',
        nameEn: 'Differential Diagnosis',
        description: 'Ranked differential diagnoses with red flags and recommended workup',
        icon: '\u{1F50D}',
        color: '#3B82F6',
        category: 'DIAGNOSIS',
        sortOrder: 1,
        supportsTreatmentApproach: false,
        toolCategories: ['diagnosis'],
        defaultSubOptions: null,
        skillPromptSuffix: [
            'When this skill is active, prioritize differential diagnosis in your response.',
            'Provide: (1) ranked differentials with probability estimates, (2) critical red flags,',
            '(3) recommended diagnostic workup, (4) specialist referral triggers.',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'rx-prescriptions',
        name: 'Prescri\u00e7\u00f5es / Rx',
        namePtBr: 'Prescri\u00e7\u00f5es / Rx',
        nameEn: 'Prescriptions / Rx',
        description: 'Medication selection, dosing, interactions, and generic alternatives',
        icon: '\u{1F48A}',
        color: '#8B5CF6',
        category: 'TREATMENT',
        sortOrder: 2,
        supportsTreatmentApproach: true,
        toolCategories: ['medications', 'prescriptions'],
        defaultSubOptions: {
            includeGenericAlternatives: true,
            checkRenalDosing: true,
            checkHepaticDosing: false,
            flagPregnancyCategory: true,
        },
        skillPromptSuffix: [
            'When this skill is active, emphasize medication-related guidance.',
            'Include: drug selection rationale, dosing (weight/renal/hepatic adjusted),',
            'interaction checks, generic alternatives when available.',
            '{{treatmentApproach}}',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'pics-integrative',
        name: 'Pr\u00e1ticas Integrativas e Complementares',
        namePtBr: 'Pr\u00e1ticas Integrativas e Complementares (PICs)',
        nameEn: 'Integrative & Complementary Practices',
        description: 'PNPIC-recognized integrative practices: acupuncture, phytotherapy, homeopathy, and 26 more',
        icon: '\u{1F33F}',
        color: '#10B981',
        category: 'TREATMENT',
        sortOrder: 3,
        supportsTreatmentApproach: true,
        toolCategories: ['medications', 'prescriptions'],
        defaultSubOptions: {
            includePhytotherapy: true,
            includeAcupuncture: true,
            includeHomeopathy: false,
            citePNPICGuidelines: true,
        },
        skillPromptSuffix: [
            'When this skill is active, include Pr\u00e1ticas Integrativas e Complementares (PICs)',
            'as recognized by Brazil\'s PNPIC (Pol\u00edtica Nacional de Pr\u00e1ticas Integrativas e Complementares)',
            'within SUS. These are CFM-recognized complementary approaches, not alternative replacements.',
            'Always ground recommendations in available evidence and cite PNPIC classification.',
            '{{treatmentApproach}}',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'prevention-screening',
        name: 'Preven\u00e7\u00e3o e Rastreamento',
        namePtBr: 'Preven\u00e7\u00e3o e Rastreamento',
        nameEn: 'Prevention & Screening',
        description: 'Guideline-based screenings, immunizations, and risk stratification',
        icon: '\u{1F6E1}',
        color: '#F59E0B',
        category: 'PREVENTION',
        sortOrder: 4,
        supportsTreatmentApproach: false,
        toolCategories: ['prevention', 'screenings'],
        defaultSubOptions: {
            useUSPSTFGuidelines: true,
            useBrazilianMSGuidelines: true,
            includeImmunizations: true,
        },
        skillPromptSuffix: [
            'When this skill is active, prioritize preventive care.',
            'Include overdue screenings, risk-based interventions, immunization gaps,',
            'and lifestyle modifications with evidence grades.',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'clinical-notes-soap',
        name: 'Notas Cl\u00ednicas / SOAP',
        namePtBr: 'Notas Cl\u00ednicas / SOAP',
        nameEn: 'Clinical Notes / SOAP',
        description: 'Structured SOAP note generation from session transcripts',
        icon: '\u{1F4DD}',
        color: '#6366F1',
        category: 'DOCUMENTATION',
        sortOrder: 5,
        supportsTreatmentApproach: false,
        toolCategories: ['clinical-notes', 'recordings'],
        defaultSubOptions: {
            includeICD10Codes: true,
            includeBillingCodes: false,
            autoDetectLanguage: true,
        },
        skillPromptSuffix: [
            'When this skill is active, focus on clinical documentation.',
            'Generate structured SOAP notes. Flag missing information.',
            'Use standard medical abbreviations. Include ICD-10 codes where determinable.',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'lab-imaging-orders',
        name: 'Exames e Imagem',
        namePtBr: 'Exames Laboratoriais e Imagem',
        nameEn: 'Lab & Imaging Orders',
        description: 'Recommended labs, imaging studies, and interpretation guidance',
        icon: '\u{1F9EA}',
        color: '#EC4899',
        category: 'DIAGNOSIS',
        sortOrder: 6,
        supportsTreatmentApproach: false,
        toolCategories: ['lab', 'lab-orders', 'lab-results', 'imaging'],
        defaultSubOptions: {
            suggestUrgency: true,
            includeReferenceRanges: true,
            flagCriticalValues: true,
        },
        skillPromptSuffix: [
            'When this skill is active, provide lab and imaging recommendations.',
            'Include: recommended tests with clinical rationale, urgency level,',
            'expected findings, and interpretation guidance for abnormal results.',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'referrals',
        name: 'Encaminhamentos',
        namePtBr: 'Encaminhamentos',
        nameEn: 'Referrals',
        description: 'Specialist referral recommendations with urgency classification',
        icon: '\u{1F517}',
        color: '#14B8A6',
        category: 'WORKFLOW',
        sortOrder: 7,
        supportsTreatmentApproach: false,
        toolCategories: ['referrals'],
        defaultSubOptions: {
            includeUrgencyLevel: true,
            suggestPreReferralWorkup: true,
        },
        skillPromptSuffix: [
            'When this skill is active, include specialist referral guidance.',
            'Specify: which specialty, urgency (routine/urgent/emergent),',
            'pre-referral workup to complete, and key information to include in referral letter.',
            '{{customInstructions}}',
        ].join('\n'),
    },
    {
        slug: 'patient-education',
        name: 'Educa\u00e7\u00e3o do Paciente',
        namePtBr: 'Educa\u00e7\u00e3o do Paciente',
        nameEn: 'Patient Education',
        description: 'Plain-language explanations and self-care instructions for patients',
        icon: '\u{1F4DA}',
        color: '#F97316',
        category: 'WORKFLOW',
        sortOrder: 8,
        supportsTreatmentApproach: true,
        toolCategories: ['patients', 'forms'],
        defaultSubOptions: {
            useSimpleLanguage: true,
            includeVisualAids: false,
            targetLanguage: true, // true = use patient's language
        },
        skillPromptSuffix: [
            'When this skill is active, generate patient-facing educational content.',
            'Use clear, non-technical language appropriate for health literacy levels.',
            'Include: condition explanation, what to expect, self-care instructions,',
            'when to seek emergency care, and follow-up reminders.',
            '{{treatmentApproach}}',
            '{{customInstructions}}',
        ].join('\n'),
    },
];

export const builtinSkillMap = new Map<string, BuiltinSkillDefinition>(
    BUILTIN_SKILL_DEFINITIONS.map((s) => [s.slug, s]),
);

// ── Treatment Approach Directive ─────────────────────────────────────

/**
 * Convert a TreatmentApproachPreset into a prompt directive paragraph.
 * Returns empty string if preset is null (skill doesn't support treatment approach).
 */
export function buildTreatmentApproachDirective(preset: TreatmentApproachPreset | null | undefined): string {
    if (!preset) return '';

    const directives: Record<TreatmentApproachPreset, string> = {
        MBE_ONLY: [
            'Treatment approach: Focus exclusively on Medicina Baseada em Evid\u00eancias (MBE).',
            'Use conventional evidence-based guidelines only.',
            'Do not suggest integrative or complementary practices.',
        ].join(' '),

        MBE_PRIMARY: [
            'Treatment approach: Primarily evidence-based (MBE),',
            'with brief mention of any well-evidenced Pr\u00e1ticas Integrativas e Complementares (PICs)',
            'recognized by PNPIC where Grade A/B evidence exists.',
        ].join(' '),

        INTEGRATIVE: [
            'Treatment approach: Integrative.',
            'Balance Medicina Baseada em Evid\u00eancias (MBE) with',
            'Pr\u00e1ticas Integrativas e Complementares (PICs) recognized under Brazil\'s PNPIC policy.',
            'Present conventional options first, then complementary approaches with their evidence level.',
            'Always note which PICs are among the 29 practices recognized by SUS.',
        ].join(' '),

        PICS_EMPHASIS: [
            'Treatment approach: Emphasize Pr\u00e1ticas Integrativas e Complementares (PICs)',
            'recognized by PNPIC/SUS, while maintaining evidence-based safety guardrails.',
            'Include phytotherapy, acupuncture, and other applicable modalities.',
            'Always note evidence grade and any contraindications.',
        ].join(' '),

        PICS_LEAD: [
            'Treatment approach: Lead with Pr\u00e1ticas Integrativas e Complementares (PICs) from PNPIC,',
            'supplemented by conventional evidence-based interventions where necessary for safety.',
            'Prioritize: phytotherapy, acupuncture, homeopathy, anthroposophic medicine,',
            'and other PNPIC-recognized modalities. Always include safety considerations and contraindications.',
        ].join(' '),
    };

    return directives[preset];
}

// ── Specialty-Aware Skill Defaults ───────────────────────────────────

/**
 * Maps User.specialty to default skill configurations.
 * Used on first-time skill initialization to pre-activate relevant skills.
 * Keys are lowercase specialty strings; values are slug → { enabled, priority, treatmentApproach }.
 */
export const SPECIALTY_SKILL_DEFAULTS: Record<string, Record<string, {
    enabled: boolean;
    priority: number;
    treatmentApproach?: TreatmentApproachPreset;
}>> = {
    // Primary care / family medicine — broad skill set
    'family medicine': {
        'differential-dx': { enabled: true, priority: 4 },
        'rx-prescriptions': { enabled: true, priority: 4 },
        'pics-integrative': { enabled: true, priority: 2, treatmentApproach: 'INTEGRATIVE' },
        'prevention-screening': { enabled: true, priority: 5 },
        'clinical-notes-soap': { enabled: true, priority: 3 },
        'lab-imaging-orders': { enabled: true, priority: 3 },
        'referrals': { enabled: true, priority: 3 },
        'patient-education': { enabled: true, priority: 3, treatmentApproach: 'INTEGRATIVE' },
    },
    'internal medicine': {
        'differential-dx': { enabled: true, priority: 5 },
        'rx-prescriptions': { enabled: true, priority: 4 },
        'pics-integrative': { enabled: false, priority: 1 },
        'prevention-screening': { enabled: true, priority: 4 },
        'clinical-notes-soap': { enabled: true, priority: 3 },
        'lab-imaging-orders': { enabled: true, priority: 4 },
        'referrals': { enabled: true, priority: 3 },
        'patient-education': { enabled: true, priority: 2 },
    },
    'cardiology': {
        'differential-dx': { enabled: true, priority: 4 },
        'rx-prescriptions': { enabled: true, priority: 5 },
        'prevention-screening': { enabled: true, priority: 5 },
        'lab-imaging-orders': { enabled: true, priority: 4 },
        'clinical-notes-soap': { enabled: true, priority: 3 },
    },
    'dermatology': {
        'differential-dx': { enabled: true, priority: 5 },
        'rx-prescriptions': { enabled: true, priority: 3 },
        'pics-integrative': { enabled: true, priority: 3, treatmentApproach: 'INTEGRATIVE' },
        'patient-education': { enabled: true, priority: 4, treatmentApproach: 'INTEGRATIVE' },
        'referrals': { enabled: true, priority: 2 },
    },
    'pediatrics': {
        'differential-dx': { enabled: true, priority: 4 },
        'rx-prescriptions': { enabled: true, priority: 5 },
        'prevention-screening': { enabled: true, priority: 5 },
        'patient-education': { enabled: true, priority: 4 },
        'lab-imaging-orders': { enabled: true, priority: 3 },
    },
    'psychiatry': {
        'differential-dx': { enabled: true, priority: 4 },
        'rx-prescriptions': { enabled: true, priority: 5 },
        'pics-integrative': { enabled: true, priority: 3, treatmentApproach: 'MBE_PRIMARY' },
        'clinical-notes-soap': { enabled: true, priority: 4 },
        'patient-education': { enabled: true, priority: 4 },
    },
    'orthopedics': {
        'differential-dx': { enabled: true, priority: 4 },
        'lab-imaging-orders': { enabled: true, priority: 5 },
        'rx-prescriptions': { enabled: true, priority: 3 },
        'referrals': { enabled: true, priority: 3 },
        'pics-integrative': { enabled: true, priority: 2, treatmentApproach: 'INTEGRATIVE' },
    },
};

/**
 * Get default skill configs for a specialty.
 * Falls back to 'family medicine' defaults if specialty is unknown.
 */
export function getSpecialtyDefaults(specialty: string | null | undefined): Record<string, {
    enabled: boolean;
    priority: number;
    treatmentApproach?: TreatmentApproachPreset;
}> {
    if (!specialty) return SPECIALTY_SKILL_DEFAULTS['family medicine'];
    const key = specialty.toLowerCase().trim();
    return SPECIALTY_SKILL_DEFAULTS[key] ?? SPECIALTY_SKILL_DEFAULTS['family medicine'];
}

// ── Prompt Suffix Processing ─────────────────────────────────────────

/**
 * Process a skill's prompt suffix, replacing template variables.
 */
export function processSkillSuffix(
    suffix: string,
    treatmentApproach: TreatmentApproachPreset | null,
    customInstructions: string | null,
): string {
    let result = suffix;
    result = result.replace('{{treatmentApproach}}', buildTreatmentApproachDirective(treatmentApproach));
    result = result.replace('{{customInstructions}}', customInstructions?.trim() || '');
    return result.replace(/\n{3,}/g, '\n\n').trim();
}
