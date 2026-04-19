/**
 * CAM consult knowledge base — seed content.
 *
 * This is the rule-based MVP surface. It maps clinical complaint keywords
 * to CAM modalities with evidence tiers drawn from peer-reviewed consensus
 * (Cochrane reviews, NCCIH, WHO Traditional Medicine Strategy).
 *
 * FUTURE: this file is the insertion point for the RAG layer (starting with
 * curated content from Dr. Ahmed El Tassa). The public API
 * (`resolveComplaint`) stays stable; the backing store can swap from this
 * static map to a vector-retrieved document without breaking callers.
 */
import type { MedicalSystemType } from '@prisma/client';

export type EvidenceTier = 'A' | 'B' | 'C' | 'D';

export interface ModalitySuggestion {
  /** Canonical modality name — matches the specialty slug in our directory */
  modalitySlug: string;
  displayName: string;
  systemType: MedicalSystemType;
  evidenceTier: EvidenceTier;
  /** One-sentence summary a clinician can paraphrase to a patient */
  summary: string;
  /** Citations backing this suggestion — PMIDs where available */
  citations: { source: string; pmid?: string; doi?: string }[];
  /** Which complaint tags this modality addresses */
  indicationTags: string[];
}

/**
 * Complaint keyword → internal tag. Keywords are lower-cased and matched
 * as substrings. Multilingual variants (pt/es) are included so clinicians
 * can enter the complaint in the patient's language.
 */
export const COMPLAINT_TAG_MAP: Record<string, string[]> = {
  chronic_pain: [
    'chronic pain', 'dor crônica', 'dolor crónico', 'low back pain', 'lombar',
    'dolor lumbar', 'neck pain', 'cervical', 'cervicalgia', 'headache', 'cefaleia', 'cefalea',
    'migraine', 'enxaqueca', 'migraña', 'fibromyalgia', 'fibromialgia',
  ],
  anxiety_sleep: [
    'anxiety', 'ansiedade', 'ansiedad', 'insomnia', 'insônia', 'insomnio',
    'sleep', 'sono', 'sueño', 'stress', 'estresse', 'estrés',
    'burnout', 'esgotamento',
  ],
  digestive: [
    'digestive', 'digestão', 'digestión', 'ibs', 'irritable bowel',
    'síndrome do intestino irritável', 'síndrome del intestino irritable',
    'reflux', 'refluxo', 'reflujo', 'bloating', 'distensão', 'distensión',
    'constipation', 'constipação', 'estreñimiento',
  ],
  menopause_hormonal: [
    'menopause', 'menopausa', 'menopausia', 'hot flash', 'ondas de calor', 'sofocos',
    'pms', 'pré-menstrual', 'premenstrual', 'tpm', 'síndrome premenstrual',
  ],
  musculoskeletal: [
    'shoulder', 'ombro', 'hombro', 'knee', 'joelho', 'rodilla',
    'arthritis', 'artrite', 'artritis', 'tendinitis', 'tendinite',
    'spine', 'coluna', 'columna',
  ],
  fatigue_immunity: [
    'fatigue', 'fadiga', 'fatiga', 'chronic fatigue', 'síndrome da fadiga',
    'low energy', 'cansaço', 'cansancio', 'immune', 'imune', 'inmune',
    'recurrent infection', 'infecção recorrente',
  ],
  skin: [
    'eczema', 'psoriasis', 'psoríase', 'acne', 'rosacea', 'rosácea',
    'dermatitis', 'dermatite',
  ],
  preop_ponv: [
    'postoperative nausea', 'ponv', 'náusea pós-operatória', 'náusea postoperatoria',
    'surgery nausea', 'cinetose',
  ],
  chemo_supportive: [
    'chemotherapy', 'quimioterapia', 'cancer fatigue', 'neuropathy',
    'neuropatia', 'cancer pain',
  ],
};

export const MODALITIES: ModalitySuggestion[] = [
  {
    modalitySlug: 'acupuntura',
    displayName: 'Acupuncture',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'A',
    summary: 'Cochrane-level evidence (PC6 acupoint) for chemotherapy- and surgery-induced nausea. Consistent evidence for chronic low back pain, tension-type headache, and migraine prophylaxis.',
    citations: [
      { source: 'Cochrane CD003281 — PC6 acupoint stimulation for PONV', pmid: '26522652' },
      { source: 'NCCIH Acupuncture: In Depth (2023)' },
    ],
    indicationTags: ['chronic_pain', 'preop_ponv', 'chemo_supportive', 'musculoskeletal', 'anxiety_sleep', 'menopause_hormonal'],
  },
  {
    modalitySlug: 'medicina-tradicional-chinesa',
    displayName: 'Traditional Chinese Medicine',
    systemType: 'TRADITIONAL',
    evidenceTier: 'B',
    summary: 'Whole-system approach combining acupuncture, herbal formulae, tui na, and dietary therapy. Strongest evidence for chronic pain syndromes and functional digestive complaints.',
    citations: [
      { source: 'WHO Traditional Medicine Strategy 2014–2023' },
      { source: 'BMJ 2011 — TCM for functional dyspepsia systematic review' },
    ],
    indicationTags: ['chronic_pain', 'digestive', 'menopause_hormonal', 'fatigue_immunity'],
  },
  {
    modalitySlug: 'medicina-integrativa',
    displayName: 'Integrative Medicine',
    systemType: 'INTEGRATIVE',
    evidenceTier: 'B',
    summary: 'MD-led combination of conventional medicine with evidence-based complementary modalities. Strong fit for chronic conditions where lifestyle, nutrition, and mind-body factors are primary drivers.',
    citations: [
      { source: 'Academic Consortium for Integrative Medicine & Health — Guideline 2022' },
    ],
    indicationTags: ['chronic_pain', 'anxiety_sleep', 'menopause_hormonal', 'fatigue_immunity', 'skin', 'digestive'],
  },
  {
    modalitySlug: 'medicina-funcional',
    displayName: 'Functional Medicine',
    systemType: 'INTEGRATIVE',
    evidenceTier: 'C',
    summary: 'Systems-biology approach to chronic disease; protocol-driven. Evidence base is emerging — strongest observational signal in metabolic and gut-related conditions.',
    citations: [
      { source: 'IFM Clinical Practice Guidelines 2023' },
    ],
    indicationTags: ['digestive', 'fatigue_immunity', 'menopause_hormonal'],
  },
  {
    modalitySlug: 'ayurveda',
    displayName: 'Ayurveda',
    systemType: 'TRADITIONAL',
    evidenceTier: 'C',
    summary: 'Whole-system approach originating in the Indian subcontinent. Best evidence for osteoarthritis pain (with turmeric/boswellia protocols) and chronic digestive complaints. Herbal preparations require pre-op disclosure.',
    citations: [
      { source: 'WHO Benchmarks for Training in Ayurveda 2010' },
      { source: 'J Altern Complement Med — Ayurveda for knee OA' },
    ],
    indicationTags: ['chronic_pain', 'digestive', 'skin', 'musculoskeletal'],
  },
  {
    modalitySlug: 'homeopatia',
    displayName: 'Homeopathy',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'C',
    summary: 'Recognised specialty under CFM (Brazil) since 1980. Evidence base is contested; offer when patient explicitly requests and in combination with conventional care — never as a substitute for proven treatment in serious disease.',
    citations: [
      { source: 'CFM Resolução 1.000/1980 (Homeopatia)' },
      { source: 'NHMRC 2015 — Evidence on Homeopathy (skeptical)' },
    ],
    indicationTags: ['skin', 'anxiety_sleep', 'digestive'],
  },
  {
    modalitySlug: 'naturopatia',
    displayName: 'Naturopathy',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'C',
    summary: 'Practitioner-led lifestyle, nutritional and botanical therapy. Emerging evidence for cardiovascular risk reduction and functional digestive complaints.',
    citations: [
      { source: 'WHO Benchmarks for Training in Naturopathy 2010' },
      { source: 'CMAJ 2013 — Naturopathy for CVD risk' },
    ],
    indicationTags: ['fatigue_immunity', 'digestive', 'skin'],
  },
  {
    modalitySlug: 'quiropraxia',
    displayName: 'Chiropractic',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'B',
    summary: 'Primarily manual therapy for musculoskeletal complaints. Strongest evidence in acute and subacute low back pain and cervicogenic headache.',
    citations: [
      { source: 'JAMA 2017 — Spinal manipulation for acute LBP' },
    ],
    indicationTags: ['musculoskeletal', 'chronic_pain'],
  },
  {
    modalitySlug: 'osteopatia',
    displayName: 'Osteopathy',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'B',
    summary: 'Manual medicine with biomechanical focus. Evidence for chronic low back pain, tension-type headache, and functional abdominal pain.',
    citations: [
      { source: 'BMC Musculoskelet Disord 2014 — OMT for chronic LBP systematic review' },
    ],
    indicationTags: ['musculoskeletal', 'chronic_pain', 'digestive'],
  },
  {
    modalitySlug: 'fitoterapia',
    displayName: 'Phytotherapy',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'C',
    summary: 'Herbal medicine with defined pharmacognosy. Evidence strength varies widely by herb. Always cross-reference the pre-op herbal contraindication tool before recommending.',
    citations: [
      { source: 'Brazil PNPIC — Portaria 971/2006 & 849/2017' },
      { source: 'NCCIH Herbs at a Glance' },
    ],
    indicationTags: ['digestive', 'menopause_hormonal', 'anxiety_sleep', 'skin'],
  },
  {
    modalitySlug: 'meditacao',
    displayName: 'Meditation Therapy',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'A',
    summary: 'Mindfulness-Based Stress Reduction (MBSR) and related programs have RCT-level evidence for anxiety, insomnia, and chronic pain coping. Zero supplement interactions.',
    citations: [
      { source: 'JAMA Intern Med 2014 — Meditation programs meta-analysis', pmid: '24395196' },
    ],
    indicationTags: ['anxiety_sleep', 'chronic_pain', 'chemo_supportive'],
  },
  {
    modalitySlug: 'yoga-terapeutico',
    displayName: 'Therapeutic Yoga',
    systemType: 'COMPLEMENTARY',
    evidenceTier: 'B',
    summary: 'Evidence for chronic low back pain, neck pain, and anxiety-related sleep disturbance. Low risk in most populations; screen for pre-existing cervical/vascular conditions before inversions.',
    citations: [
      { source: 'Ann Intern Med 2017 — Yoga for chronic LBP' },
    ],
    indicationTags: ['chronic_pain', 'anxiety_sleep', 'musculoskeletal'],
  },
  {
    modalitySlug: 'medicina-antroposofica',
    displayName: 'Anthroposophic Medicine',
    systemType: 'TRADITIONAL',
    evidenceTier: 'C',
    summary: 'MD-led whole-system approach from the Central European tradition. Observational evidence for quality-of-life improvements in chronic disease.',
    citations: [
      { source: 'BMJ Open 2013 — AMG cohort study' },
      { source: 'Brazil PNPIC — Portaria 849/2017' },
    ],
    indicationTags: ['fatigue_immunity', 'chronic_pain', 'skin'],
  },
];

/**
 * Tag a complaint string using the keyword map. Returns de-duplicated
 * internal tags, sorted by match strength (longest match first).
 */
export function tagComplaint(complaint: string): string[] {
  const hay = complaint.toLowerCase();
  const tagMatches = new Map<string, number>();

  for (const [tag, keywords] of Object.entries(COMPLAINT_TAG_MAP)) {
    for (const kw of keywords) {
      if (hay.includes(kw)) {
        const score = kw.length;
        tagMatches.set(tag, Math.max(tagMatches.get(tag) ?? 0, score));
      }
    }
  }

  return [...tagMatches.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([tag]) => tag);
}
