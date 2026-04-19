/**
 * Seed PROMIS-29 v2.1 + ERAS colorectal post-op care plan.
 *
 * PROMIS-29 items and Portuguese / Spanish translations sourced from
 * HealthMeasures (https://www.healthmeasures.net/explore-measurement-systems/promis),
 * free for academic + non-commercial use. Item codes are canonical.
 *
 * ERAS colorectal protocol from Gustafsson UO et al., Guidelines for
 * Perioperative Care in Elective Colorectal Surgery: ERAS Society
 * Recommendations 2018 (World J Surg 2019;43:659–695; PMID 30426190).
 *
 * Run after the SQL migration; idempotent via upsert on slug.
 */
import { PrismaClient, PromDomain, CarePlanPhase, CarePlanTaskKind } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Response option templates ────────────────────────────────────────────

// 5-point Likert with semantic anchors (PROMIS default for most domains)
const NEVER_ALWAYS = [
  { value: 1, labelEn: 'Never',      labelPt: 'Nunca',         labelEs: 'Nunca' },
  { value: 2, labelEn: 'Rarely',     labelPt: 'Raramente',     labelEs: 'Raramente' },
  { value: 3, labelEn: 'Sometimes',  labelPt: 'Às vezes',      labelEs: 'A veces' },
  { value: 4, labelEn: 'Often',      labelPt: 'Com frequência', labelEs: 'A menudo' },
  { value: 5, labelEn: 'Always',     labelPt: 'Sempre',         labelEs: 'Siempre' },
];

// 5-point intensity scale (PROMIS bother/interference)
const NOT_AT_ALL_VERY_MUCH = [
  { value: 1, labelEn: 'Not at all',   labelPt: 'De modo algum',   labelEs: 'Para nada' },
  { value: 2, labelEn: 'A little bit', labelPt: 'Um pouco',         labelEs: 'Un poco' },
  { value: 3, labelEn: 'Somewhat',     labelPt: 'Mais ou menos',    labelEs: 'Moderadamente' },
  { value: 4, labelEn: 'Quite a bit',  labelPt: 'Bastante',         labelEs: 'Bastante' },
  { value: 5, labelEn: 'Very much',    labelPt: 'Muitíssimo',       labelEs: 'Muchísimo' },
];

// Physical Function difficulty scale
const DIFFICULTY = [
  { value: 5, labelEn: 'Without any difficulty', labelPt: 'Sem qualquer dificuldade', labelEs: 'Sin ninguna dificultad' },
  { value: 4, labelEn: 'With a little difficulty', labelPt: 'Com um pouco de dificuldade', labelEs: 'Con un poco de dificultad' },
  { value: 3, labelEn: 'With some difficulty', labelPt: 'Com alguma dificuldade', labelEs: 'Con algo de dificultad' },
  { value: 2, labelEn: 'With much difficulty', labelPt: 'Com muita dificuldade', labelEs: 'Con mucha dificultad' },
  { value: 1, labelEn: 'Unable to do', labelPt: 'Incapaz de fazer', labelEs: 'Incapaz de hacerlo' },
];

// Pain intensity 0-10 NRS
const NRS_0_10 = Array.from({ length: 11 }, (_, i) => ({
  value: i,
  labelEn: i === 0 ? 'No pain' : i === 10 ? 'Worst imaginable pain' : String(i),
  labelPt: i === 0 ? 'Sem dor' : i === 10 ? 'Pior dor imaginável' : String(i),
  labelEs: i === 0 ? 'Sin dolor' : i === 10 ? 'El peor dolor imaginable' : String(i),
}));

// ─── PROMIS-29 v2.1 items ─────────────────────────────────────────────────

interface PromQuestionSeed {
  orderIndex: number;
  itemCode: string;
  domain: PromDomain;
  recallPeriod?: string;
  textEn: string;
  textPt: string;
  textEs: string;
  responseOptions: typeof NEVER_ALWAYS;
  reverseScored?: boolean;
}

const PROMIS_29_ITEMS: PromQuestionSeed[] = [
  // Physical Function (4) — "Are you able to..."
  { orderIndex: 1,  itemCode: 'PFA11',  domain: 'PHYSICAL_FUNCTION', textEn: 'Are you able to do chores such as vacuuming or yard work?', textPt: 'Você é capaz de fazer tarefas como aspirar a casa ou trabalhos de jardinagem?', textEs: '¿Puede realizar tareas del hogar como aspirar o trabajar en el jardín?', responseOptions: DIFFICULTY },
  { orderIndex: 2,  itemCode: 'PFA21',  domain: 'PHYSICAL_FUNCTION', textEn: 'Are you able to go up and down stairs at a normal pace?', textPt: 'Você é capaz de subir e descer escadas em ritmo normal?', textEs: '¿Puede subir y bajar escaleras a un ritmo normal?', responseOptions: DIFFICULTY },
  { orderIndex: 3,  itemCode: 'PFA23',  domain: 'PHYSICAL_FUNCTION', textEn: 'Are you able to go for a walk of at least 15 minutes?', textPt: 'Você é capaz de caminhar por pelo menos 15 minutos?', textEs: '¿Puede caminar al menos 15 minutos?', responseOptions: DIFFICULTY },
  { orderIndex: 4,  itemCode: 'PFA53',  domain: 'PHYSICAL_FUNCTION', textEn: 'Are you able to run errands and shop?', textPt: 'Você é capaz de sair para resolver coisas e fazer compras?', textEs: '¿Puede hacer mandados e ir de compras?', responseOptions: DIFFICULTY },

  // Anxiety (4) — recall: past 7 days
  { orderIndex: 5,  itemCode: 'EDANX01', domain: 'ANXIETY', recallPeriod: 'In the past 7 days', textEn: 'I felt fearful', textPt: 'Senti medo', textEs: 'Sentí miedo', responseOptions: NEVER_ALWAYS },
  { orderIndex: 6,  itemCode: 'EDANX40', domain: 'ANXIETY', recallPeriod: 'In the past 7 days', textEn: 'I found it hard to focus on anything other than my anxiety', textPt: 'Achei difícil me concentrar em qualquer coisa além da minha ansiedade', textEs: 'Me resultó difícil concentrarme en otra cosa que no fuera mi ansiedad', responseOptions: NEVER_ALWAYS },
  { orderIndex: 7,  itemCode: 'EDANX41', domain: 'ANXIETY', recallPeriod: 'In the past 7 days', textEn: 'My worries overwhelmed me', textPt: 'Minhas preocupações me sobrecarregaram', textEs: 'Mis preocupaciones me abrumaron', responseOptions: NEVER_ALWAYS },
  { orderIndex: 8,  itemCode: 'EDANX53', domain: 'ANXIETY', recallPeriod: 'In the past 7 days', textEn: 'I felt uneasy', textPt: 'Senti-me inquieto(a)', textEs: 'Me sentí inquieto(a)', responseOptions: NEVER_ALWAYS },

  // Depression (4) — recall: past 7 days
  { orderIndex: 9,  itemCode: 'EDDEP04', domain: 'DEPRESSION', recallPeriod: 'In the past 7 days', textEn: 'I felt worthless', textPt: 'Senti-me inútil', textEs: 'Me sentí inútil', responseOptions: NEVER_ALWAYS },
  { orderIndex: 10, itemCode: 'EDDEP06', domain: 'DEPRESSION', recallPeriod: 'In the past 7 days', textEn: 'I felt helpless', textPt: 'Senti-me desamparado(a)', textEs: 'Me sentí indefenso(a)', responseOptions: NEVER_ALWAYS },
  { orderIndex: 11, itemCode: 'EDDEP29', domain: 'DEPRESSION', recallPeriod: 'In the past 7 days', textEn: 'I felt depressed', textPt: 'Senti-me deprimido(a)', textEs: 'Me sentí deprimido(a)', responseOptions: NEVER_ALWAYS },
  { orderIndex: 12, itemCode: 'EDDEP41', domain: 'DEPRESSION', recallPeriod: 'In the past 7 days', textEn: 'I felt hopeless', textPt: 'Senti-me sem esperança', textEs: 'Me sentí sin esperanza', responseOptions: NEVER_ALWAYS },

  // Fatigue (4) — recall: past 7 days
  { orderIndex: 13, itemCode: 'HI7',      domain: 'FATIGUE', recallPeriod: 'During the past 7 days', textEn: 'I feel fatigued', textPt: 'Sinto-me fatigado(a)', textEs: 'Me siento fatigado(a)', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 14, itemCode: 'AN3',      domain: 'FATIGUE', recallPeriod: 'During the past 7 days', textEn: 'I have trouble starting things because I am tired', textPt: 'Tenho dificuldade para começar tarefas porque estou cansado(a)', textEs: 'Tengo dificultad para empezar cosas porque estoy cansado(a)', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 15, itemCode: 'FATEXP41', domain: 'FATIGUE', recallPeriod: 'During the past 7 days', textEn: 'How run-down did you feel on average?', textPt: 'Em média, quão exausto(a) você se sentiu?', textEs: 'En promedio, ¿qué tan agotado(a) se sintió?', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 16, itemCode: 'FATEXP40', domain: 'FATIGUE', recallPeriod: 'During the past 7 days', textEn: 'How fatigued were you on average?', textPt: 'Em média, quão fatigado(a) você se sentiu?', textEs: 'En promedio, ¿qué tan fatigado(a) se sintió?', responseOptions: NOT_AT_ALL_VERY_MUCH },

  // Sleep Disturbance (4) — recall: past 7 days
  { orderIndex: 17, itemCode: 'Sleep109', domain: 'SLEEP_DISTURBANCE', recallPeriod: 'In the past 7 days', textEn: 'My sleep quality was...', textPt: 'A qualidade do meu sono foi...', textEs: 'La calidad de mi sueño fue...', responseOptions: [
    { value: 5, labelEn: 'Very poor', labelPt: 'Muito ruim', labelEs: 'Muy mala' },
    { value: 4, labelEn: 'Poor',      labelPt: 'Ruim',        labelEs: 'Mala' },
    { value: 3, labelEn: 'Fair',      labelPt: 'Razoável',    labelEs: 'Regular' },
    { value: 2, labelEn: 'Good',      labelPt: 'Boa',         labelEs: 'Buena' },
    { value: 1, labelEn: 'Very good', labelPt: 'Muito boa',   labelEs: 'Muy buena' },
  ] },
  { orderIndex: 18, itemCode: 'Sleep116', domain: 'SLEEP_DISTURBANCE', recallPeriod: 'In the past 7 days', textEn: 'My sleep was refreshing', textPt: 'Meu sono foi revigorante', textEs: 'Mi sueño fue reparador', responseOptions: NOT_AT_ALL_VERY_MUCH, reverseScored: true },
  { orderIndex: 19, itemCode: 'Sleep20',  domain: 'SLEEP_DISTURBANCE', recallPeriod: 'In the past 7 days', textEn: 'I had a problem with my sleep', textPt: 'Tive algum problema com meu sono', textEs: 'Tuve algún problema con mi sueño', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 20, itemCode: 'Sleep44',  domain: 'SLEEP_DISTURBANCE', recallPeriod: 'In the past 7 days', textEn: 'I had difficulty falling asleep', textPt: 'Tive dificuldade para adormecer', textEs: 'Tuve dificultad para conciliar el sueño', responseOptions: NOT_AT_ALL_VERY_MUCH },

  // Social Role (4) — recall: general
  { orderIndex: 21, itemCode: 'SRPPER11_CaPS', domain: 'SOCIAL_ROLE', textEn: 'I have trouble doing all of my regular leisure activities with others', textPt: 'Tenho dificuldade em fazer todas as minhas atividades de lazer habituais com outras pessoas', textEs: 'Tengo dificultad para realizar todas mis actividades de ocio habituales con otras personas', responseOptions: NEVER_ALWAYS },
  { orderIndex: 22, itemCode: 'SRPPER18_CaPS', domain: 'SOCIAL_ROLE', textEn: 'I have trouble doing all of the family activities that I want to do', textPt: 'Tenho dificuldade em fazer todas as atividades familiares que desejo', textEs: 'Tengo dificultad para realizar todas las actividades familiares que quiero hacer', responseOptions: NEVER_ALWAYS },
  { orderIndex: 23, itemCode: 'SRPPER23_CaPS', domain: 'SOCIAL_ROLE', textEn: 'I have trouble doing all of my usual work (include work at home)', textPt: 'Tenho dificuldade em fazer todo o meu trabalho habitual (inclui trabalho em casa)', textEs: 'Tengo dificultad para realizar todo mi trabajo habitual (incluye el trabajo en casa)', responseOptions: NEVER_ALWAYS },
  { orderIndex: 24, itemCode: 'SRPPER46_CaPS', domain: 'SOCIAL_ROLE', textEn: 'I have trouble doing all of the activities with friends that I want to do', textPt: 'Tenho dificuldade em fazer todas as atividades com amigos que desejo', textEs: 'Tengo dificultad para realizar todas las actividades con amigos que quiero hacer', responseOptions: NEVER_ALWAYS },

  // Pain Interference (4) — recall: past 7 days
  { orderIndex: 25, itemCode: 'PAININ9',  domain: 'PAIN_INTERFERENCE', recallPeriod: 'In the past 7 days', textEn: 'How much did pain interfere with your day to day activities?', textPt: 'Quanto a dor interferiu nas suas atividades diárias?', textEs: '¿Cuánto interfirió el dolor con sus actividades diarias?', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 26, itemCode: 'PAININ22', domain: 'PAIN_INTERFERENCE', recallPeriod: 'In the past 7 days', textEn: 'How much did pain interfere with work around the home?', textPt: 'Quanto a dor interferiu no trabalho em casa?', textEs: '¿Cuánto interfirió el dolor con las tareas del hogar?', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 27, itemCode: 'PAININ31', domain: 'PAIN_INTERFERENCE', recallPeriod: 'In the past 7 days', textEn: 'How much did pain interfere with your ability to participate in social activities?', textPt: 'Quanto a dor interferiu na sua capacidade de participar de atividades sociais?', textEs: '¿Cuánto interfirió el dolor con su capacidad de participar en actividades sociales?', responseOptions: NOT_AT_ALL_VERY_MUCH },
  { orderIndex: 28, itemCode: 'PAININ34', domain: 'PAIN_INTERFERENCE', recallPeriod: 'In the past 7 days', textEn: 'How much did pain interfere with your household chores?', textPt: 'Quanto a dor interferiu nas suas tarefas domésticas?', textEs: '¿Cuánto interfirió el dolor con sus tareas del hogar?', responseOptions: NOT_AT_ALL_VERY_MUCH },

  // Pain Intensity (1 NRS item)
  { orderIndex: 29, itemCode: 'PAINAVGINT',  domain: 'PAIN_INTENSITY', recallPeriod: 'In the past 7 days', textEn: 'On average, how would you rate your pain intensity (0 = no pain, 10 = worst imaginable pain)?', textPt: 'Em média, como você classificaria a intensidade da sua dor (0 = sem dor, 10 = pior dor imaginável)?', textEs: 'En promedio, ¿cómo calificaría la intensidad de su dor (0 = sin dolor, 10 = el peor dolor imaginable)?', responseOptions: NRS_0_10 },
];

// ─── ERAS colorectal template tasks ───────────────────────────────────────

interface CareTemplateTaskSeed {
  orderIndex: number;
  phase: CarePlanPhase;
  dayOffset: number;
  kind: CarePlanTaskKind;
  title: string;
  instructions: string;
  promInstrumentSlug?: string;
}

const ERAS_COLORECTAL_TASKS: CareTemplateTaskSeed[] = [
  // ── Pre-op ──
  { orderIndex: 1,  phase: 'PRE_OP', dayOffset: -14, kind: 'EDUCATION',       title: 'Supplement & herbal review',                 instructions: 'Use the Holi Labs pre-op supplement screener to identify any herbs or supplements that must be stopped. Some (ginkgo, garlic, ginseng, St. John\'s wort) require a 14-day hold.' },
  { orderIndex: 2,  phase: 'PRE_OP', dayOffset: -14, kind: 'PROM_ASSESSMENT', title: 'Baseline PROMIS-29 assessment',              instructions: 'Complete the PROMIS-29 baseline questionnaire to establish your pre-op functional status. This anchors every recovery measure we track.', promInstrumentSlug: 'promis-29-v2-1' },
  { orderIndex: 3,  phase: 'PRE_OP', dayOffset: -7,  kind: 'EDUCATION',       title: 'Carbohydrate loading drink',                 instructions: 'Drink the prescribed clear carbohydrate beverage up to 2 hours before surgery per ERAS protocol — reduces post-op insulin resistance.' },
  { orderIndex: 4,  phase: 'PRE_OP', dayOffset: -1,  kind: 'EDUCATION',       title: 'Pre-op fasting instructions',                instructions: 'Clear fluids allowed up to 2 hours pre-op; solid food cutoff is 6 hours pre-op.' },

  // ── Surgery day (POD 0) ──
  { orderIndex: 5,  phase: 'POST_OP', dayOffset: 0,   kind: 'DIETARY',        title: 'Early oral intake',                          instructions: 'Begin sips of clear fluids within 4 hours post-op per ERAS protocol.' },
  { orderIndex: 6,  phase: 'POST_OP', dayOffset: 0,   kind: 'MOBILIZATION',   title: 'Out of bed to chair (≥ 2 hours)',            instructions: 'Goal: at least 2 hours out of bed on the surgery day. Reduces pulmonary and thromboembolic complications.' },
  { orderIndex: 7,  phase: 'POST_OP', dayOffset: 0,   kind: 'SYMPTOM_CHECK',  title: 'Pain + nausea self-report',                  instructions: 'Report pain (0–10 NRS) and nausea every 4 hours. Goal is NRS ≤ 3 with multimodal opioid-sparing analgesia.' },

  // ── POD 1 ──
  { orderIndex: 8,  phase: 'POST_OP', dayOffset: 1,   kind: 'MOBILIZATION',   title: 'Mobilize ≥ 8 hours out of bed',              instructions: 'Walk 4× in the corridor, remain upright in chair for the balance of waking hours.' },
  { orderIndex: 9,  phase: 'POST_OP', dayOffset: 1,   kind: 'DIETARY',        title: 'Advance to regular diet',                    instructions: 'Transition from clear fluids to regular diet as tolerated. No routine NG decompression.' },
  { orderIndex: 10, phase: 'POST_OP', dayOffset: 1,   kind: 'WOUND_CARE',     title: 'Urinary catheter removal',                   instructions: 'Remove urinary catheter within 24 hours unless clinical contraindication.' },

  // ── POD 2 ──
  { orderIndex: 11, phase: 'POST_OP', dayOffset: 2,   kind: 'MEDICATION',     title: 'Discontinue IV fluids',                      instructions: 'Discontinue IV once oral intake is tolerated. Convert to oral analgesia.' },
  { orderIndex: 12, phase: 'POST_OP', dayOffset: 2,   kind: 'WOUND_CARE',     title: 'Wound inspection + photograph',              instructions: 'Inspect wound for erythema, induration, or discharge. Upload a photo for asynchronous clinician review if tolerated.' },

  // ── POD 3 — discharge ──
  { orderIndex: 13, phase: 'POST_OP', dayOffset: 3,   kind: 'EDUCATION',      title: 'Discharge readiness check',                  instructions: 'Criteria: tolerating regular diet, bowel movement or flatus, pain controlled on oral analgesia, ambulating independently.' },

  // ── Follow-up ──
  { orderIndex: 14, phase: 'FOLLOW_UP', dayOffset: 7,  kind: 'APPOINTMENT',     title: 'Post-op clinic visit (day 7)',              instructions: 'Wound check, staple removal if applicable, pathology review.' },
  { orderIndex: 15, phase: 'FOLLOW_UP', dayOffset: 7,  kind: 'PROM_ASSESSMENT', title: 'PROMIS-29 — day 7',                         instructions: 'Repeat the PROMIS-29 questionnaire. Early signal of recovery trajectory vs baseline.', promInstrumentSlug: 'promis-29-v2-1' },
  { orderIndex: 16, phase: 'FOLLOW_UP', dayOffset: 14, kind: 'WOUND_CARE',      title: 'Wound photo — day 14',                      instructions: 'Upload a wound photo for asynchronous clinician review. Flag redness, discharge, dehiscence.' },
  { orderIndex: 17, phase: 'FOLLOW_UP', dayOffset: 30, kind: 'PROM_ASSESSMENT', title: 'PROMIS-29 — day 30',                        instructions: 'Repeat the PROMIS-29 questionnaire. Most patients return to ~baseline function by day 30 after elective colorectal surgery.', promInstrumentSlug: 'promis-29-v2-1' },
  { orderIndex: 18, phase: 'FOLLOW_UP', dayOffset: 90, kind: 'PROM_ASSESSMENT', title: 'PROMIS-29 — day 90',                        instructions: 'Final longitudinal PROMIS-29 assessment. Delta vs baseline is a core ERAS outcome.', promInstrumentSlug: 'promis-29-v2-1' },
];

// ─── Seed runner ──────────────────────────────────────────────────────────

async function seedPromis29() {
  const instrument = await prisma.promInstrument.upsert({
    where: { slug: 'promis-29-v2-1' },
    update: {
      name: 'PROMIS-29 Profile v2.1',
      displayEn: 'PROMIS-29 Profile',
      displayPt: 'Perfil PROMIS-29',
      displayEs: 'Perfil PROMIS-29',
      description:
        'Seven 4-item short-forms covering Physical Function, Anxiety, Depression, Fatigue, Sleep Disturbance, Social Role, and Pain Interference, plus a single Pain Intensity 0-10 numerical rating.',
      version: '2.1',
      licensingNote: 'Free for academic and non-commercial use via HealthMeasures.net. Commercial use requires a licence.',
      citationPmid: '19543809',
      itemCount: PROMIS_29_ITEMS.length,
    },
    create: {
      slug: 'promis-29-v2-1',
      name: 'PROMIS-29 Profile v2.1',
      displayEn: 'PROMIS-29 Profile',
      displayPt: 'Perfil PROMIS-29',
      displayEs: 'Perfil PROMIS-29',
      description:
        'Seven 4-item short-forms covering Physical Function, Anxiety, Depression, Fatigue, Sleep Disturbance, Social Role, and Pain Interference, plus a single Pain Intensity 0-10 numerical rating.',
      version: '2.1',
      licensingNote: 'Free for academic and non-commercial use via HealthMeasures.net. Commercial use requires a licence.',
      citationPmid: '19543809',
      itemCount: PROMIS_29_ITEMS.length,
    },
  });

  // Wipe and recreate questions to stay in sync with the seed file
  await prisma.promQuestion.deleteMany({ where: { instrumentId: instrument.id } });

  for (const q of PROMIS_29_ITEMS) {
    await prisma.promQuestion.create({
      data: {
        instrumentId: instrument.id,
        orderIndex: q.orderIndex,
        itemCode: q.itemCode,
        domain: q.domain,
        recallPeriod: q.recallPeriod ?? null,
        textEn: q.textEn,
        textPt: q.textPt,
        textEs: q.textEs,
        responseOptions: q.responseOptions as unknown as object,
        reverseScored: q.reverseScored ?? false,
      },
    });
  }

  console.log(`Seeded PROMIS-29 with ${PROMIS_29_ITEMS.length} questions`);
}

async function seedErasColorectal() {
  const template = await prisma.carePlanTemplate.upsert({
    where: { slug: 'eras-colorectal-v2018' },
    update: {
      procedureName: 'Elective colorectal surgery',
      description:
        'Enhanced Recovery After Surgery pathway for elective colorectal surgery. Pre-op supplement review, multimodal opioid-sparing analgesia, early oral intake and mobilization, scheduled PROMIS-29 at baseline, day 7, day 30, and day 90.',
      protocolSource: 'ERAS Society 2018 — Gustafsson UO et al., World J Surg 2019;43:659–695',
      citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/30426190/',
      version: '2018',
    },
    create: {
      slug: 'eras-colorectal-v2018',
      procedureName: 'Elective colorectal surgery',
      description:
        'Enhanced Recovery After Surgery pathway for elective colorectal surgery. Pre-op supplement review, multimodal opioid-sparing analgesia, early oral intake and mobilization, scheduled PROMIS-29 at baseline, day 7, day 30, and day 90.',
      protocolSource: 'ERAS Society 2018 — Gustafsson UO et al., World J Surg 2019;43:659–695',
      citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/30426190/',
      version: '2018',
    },
  });

  await prisma.carePlanTemplateTask.deleteMany({ where: { templateId: template.id } });

  for (const t of ERAS_COLORECTAL_TASKS) {
    await prisma.carePlanTemplateTask.create({
      data: {
        templateId: template.id,
        orderIndex: t.orderIndex,
        phase: t.phase,
        dayOffset: t.dayOffset,
        kind: t.kind,
        title: t.title,
        instructions: t.instructions,
        promInstrumentSlug: t.promInstrumentSlug ?? null,
      },
    });
  }

  console.log(`Seeded ERAS colorectal template with ${ERAS_COLORECTAL_TASKS.length} tasks`);
}

async function main() {
  try {
    await seedPromis29();
    await seedErasColorectal();
    console.log('\nSeed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
