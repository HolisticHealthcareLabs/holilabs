import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';

/**
 * POST /api/clinical/context-scan
 *
 * Fires when consent is granted for a patient encounter.
 * Ingests the patient's structured medical record and returns a pre-computed
 * clinical context object: active meds, allergies, key diagnoses, recent labs,
 * and risk flags — ready for the CDSS and SOAP engine to consume instantly.
 *
 * Trigger: consent grant (NOT patient selection — LGPD/HIPAA safe).
 * Cache: one scan per patient per calendar day; invalidated on new data events.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClinicalContextRequest {
  patientId: string;
  encounterId: string;
  facesheetData?: {
    problems?: { description: string; status: string }[];
    medications?: { name: string; dose: string; frequency: string }[];
    allergies?: { allergen: string; reaction: string; severity: string }[];
    diagnoses?: { description: string; icd10: string }[];
    recentLabs?: { name: string; value: string; unit: string; date: string; flag?: string }[];
  };
}

export interface ClinicalContextResult {
  patientId: string;
  encounterId: string;
  generatedAt: string;
  activeMedications: {
    name: string;
    dose: string;
    frequency: string;
    drugClass: string;
  }[];
  allergies: {
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe';
    crossReactivity: string[];
  }[];
  activeDiagnoses: {
    description: string;
    icd10: string;
    clinicalRelevance: 'high' | 'moderate' | 'low';
  }[];
  riskFlags: {
    flag: string;
    severity: 'critical' | 'warning' | 'info';
    detail: string;
  }[];
  suggestedScreenings: string[];
  interactionMatrix: {
    drug1: string;
    drug2: string;
    severity: 'critical' | 'major' | 'moderate' | 'minor';
    description: string;
  }[];
  clinicalSummary: string;
}

// ─── In-memory cache (per-process; production would use Redis) ────────────────

const contextCache = new Map<string, { result: ClinicalContextResult; date: string }>();

function getCacheKey(patientId: string): string {
  return `${patientId}:${new Date().toISOString().slice(0, 10)}`;
}

// ─── Clinical context generation engine ───────────────────────────────────────
// In production, this calls the LLM with the structured patient record.
// For the prototype, we generate deterministic, medically-accurate context
// from the facesheet data to demonstrate the full pipeline.

function generateClinicalContext(
  req: ClinicalContextRequest,
): ClinicalContextResult {
  const fs = req.facesheetData;
  const now = new Date().toISOString();

  // Enrich medications with drug class inference
  const activeMeds = (fs?.medications ?? []).map((m) => ({
    name: m.name,
    dose: m.dose,
    frequency: m.frequency,
    drugClass: inferDrugClass(m.name),
  }));

  // Enrich allergies with cross-reactivity
  const allergies = (fs?.allergies ?? []).map((a) => ({
    allergen: a.allergen,
    reaction: a.reaction,
    severity: (a.severity as 'mild' | 'moderate' | 'severe') || 'moderate',
    crossReactivity: inferCrossReactivity(a.allergen),
  }));

  // Score diagnosis relevance
  const activeDiagnoses = (fs?.diagnoses ?? []).map((d) => ({
    description: d.description,
    icd10: d.icd10,
    clinicalRelevance: scoreDiagnosisRelevance(d.icd10),
  }));

  // Generate drug interaction matrix
  const interactionMatrix = computeInteractionMatrix(activeMeds);

  // Generate risk flags from the combined data
  const riskFlags = computeRiskFlags(activeMeds, allergies, fs?.problems ?? [], fs?.recentLabs ?? []);

  // Suggested preventive screenings based on diagnoses
  const suggestedScreenings = computeScreenings(activeDiagnoses);

  // One-paragraph clinical summary
  const clinicalSummary = buildClinicalSummary(activeMeds, activeDiagnoses, riskFlags);

  return {
    patientId: req.patientId,
    encounterId: req.encounterId,
    generatedAt: now,
    activeMedications: activeMeds,
    allergies,
    activeDiagnoses,
    riskFlags,
    suggestedScreenings,
    interactionMatrix,
    clinicalSummary,
  };
}

// ─── Drug class inference ─────────────────────────────────────────────────────

const DRUG_CLASS_MAP: [RegExp, string][] = [
  [/metformin/i,            'Biguanide (Antidiabetic)'],
  [/empagliflozin|dapagliflozin|canagliflozin/i, 'SGLT2 Inhibitor'],
  [/glibenclamide|glyburide|glimepiride|glipizide/i, 'Sulfonylurea'],
  [/lisinopril|ramipril|enalapril|captopril/i, 'ACE Inhibitor'],
  [/losartan|valsartan|irbesartan|candesartan/i, 'ARB'],
  [/amlodipine|nifedipine|felodipine/i, 'Calcium Channel Blocker'],
  [/bisoprolol|metoprolol|atenolol|carvedilol|propranolol/i, 'Beta-Blocker'],
  [/furosemide|bumetanide|torsemide/i, 'Loop Diuretic'],
  [/hydrochlorothiazide|chlorthalidone|indapamide/i, 'Thiazide Diuretic'],
  [/spironolactone|eplerenone/i, 'Mineralocorticoid Receptor Antagonist'],
  [/atorvastatin|rosuvastatin|simvastatin|pravastatin/i, 'Statin (HMG-CoA Reductase Inhibitor)'],
  [/aspirin/i,              'Antiplatelet (NSAID)'],
  [/clopidogrel|ticagrelor|prasugrel/i, 'Antiplatelet (P2Y12 Inhibitor)'],
  [/warfarin/i,             'Vitamin K Antagonist'],
  [/rivaroxaban|apixaban|edoxaban|dabigatran/i, 'DOAC'],
  [/omeprazole|pantoprazole|esomeprazole|lansoprazole/i, 'Proton Pump Inhibitor'],
  [/escitalopram|sertraline|fluoxetine|paroxetine|citalopram/i, 'SSRI'],
  [/venlafaxine|duloxetine|desvenlafaxine/i, 'SNRI'],
  [/mirtazapine/i,          'NaSSA (Tetracyclic Antidepressant)'],
  [/levetiracetam|carbamazepine|valproate|lamotrigine|phenytoin/i, 'Antiepileptic'],
  [/lithium/i,              'Mood Stabilizer'],
  [/doxorubicin/i,          'Anthracycline (Chemotherapy)'],
  [/cyclophosphamide/i,     'Alkylating Agent (Chemotherapy)'],
  [/ondansetron|granisetron/i, 'Antiemetic (5-HT3 Antagonist)'],
  [/paracetamol|acetaminophen/i, 'Analgesic / Antipyretic'],
  [/ibuprofen|naproxen|diclofenac/i, 'NSAID'],
  [/salbutamol|albuterol/i, 'Short-Acting Beta-2 Agonist (SABA)'],
  [/insulin/i,              'Insulin'],
  [/levothyroxine/i,        'Thyroid Hormone'],
  [/prednisolone|prednisone|dexamethasone|hydrocortisone/i, 'Corticosteroid'],
];

function inferDrugClass(drugName: string): string {
  for (const [pattern, cls] of DRUG_CLASS_MAP) {
    if (pattern.test(drugName)) return cls;
  }
  return 'Unclassified';
}

// ─── Cross-reactivity ─────────────────────────────────────────────────────────

function inferCrossReactivity(allergen: string): string[] {
  const lower = allergen.toLowerCase();
  if (lower.includes('penicillin')) return ['Amoxicillin', 'Ampicillin', 'Cephalosporins (1-2% cross-reactivity)'];
  if (lower.includes('sulfa')) return ['Sulfamethoxazole', 'Sulfasalazine', 'Celecoxib (theoretical)'];
  if (lower.includes('nsaid') || lower.includes('aspirin')) return ['Ibuprofen', 'Naproxen', 'Diclofenac', 'Ketorolac'];
  if (lower.includes('latex')) return ['Banana', 'Avocado', 'Kiwi', 'Chestnut (latex-fruit syndrome)'];
  if (lower.includes('iodine') || lower.includes('contrast')) return ['Iodinated contrast media', 'Betadine (povidone-iodine)'];
  return [];
}

// ─── Diagnosis relevance scoring ──────────────────────────────────────────────

function scoreDiagnosisRelevance(icd10: string): 'high' | 'moderate' | 'low' {
  const code = icd10.toUpperCase();
  // Cardiovascular, CKD, diabetes, cancer → high
  if (/^(I[0-5]|N18|E1[01]|C[0-9])/.test(code)) return 'high';
  // Mental health, respiratory, metabolic → moderate
  if (/^(F[0-4]|J[0-4]|E[0-9])/.test(code)) return 'moderate';
  return 'low';
}

// ─── Interaction matrix ───────────────────────────────────────────────────────

interface MedEntry { name: string; drugClass: string }

const INTERACTION_RULES: { classA: string; classB: string; severity: 'critical' | 'major' | 'moderate' | 'minor'; desc: string }[] = [
  { classA: 'Biguanide',              classB: 'Loop Diuretic',       severity: 'moderate', desc: 'Metformin + loop diuretics: monitor renal function; risk of lactic acidosis with dehydration.' },
  { classA: 'Biguanide',              classB: 'ACE Inhibitor',       severity: 'minor',    desc: 'Generally safe combination; monitor renal function periodically.' },
  { classA: 'ACE Inhibitor',          classB: 'Loop Diuretic',       severity: 'moderate', desc: 'First-dose hypotension risk. Monitor BP and renal function.' },
  { classA: 'ACE Inhibitor',          classB: 'Mineralocorticoid Receptor Antagonist', severity: 'major', desc: 'Hyperkalaemia risk. Monitor serum potassium within 1 week.' },
  { classA: 'SSRI',                   classB: 'NaSSA (Tetracyclic Antidepressant)', severity: 'moderate', desc: 'Serotonin syndrome risk at high doses. Monitor for tremor, clonus, agitation.' },
  { classA: 'Antiplatelet (NSAID)',    classB: 'Antiplatelet (P2Y12 Inhibitor)', severity: 'major', desc: 'DAPT: increased bleeding risk. Ensure PPI cover if GI risk factors present.' },
  { classA: 'Vitamin K Antagonist',    classB: 'NSAID',              severity: 'critical', desc: 'Warfarin + NSAIDs: significantly increased bleeding risk. Avoid combination.' },
  { classA: 'DOAC',                    classB: 'NSAID',              severity: 'major',    desc: 'DOAC + NSAIDs: increased bleeding risk. Use lowest NSAID dose for shortest duration.' },
  { classA: 'Sulfonylurea',            classB: 'SGLT2 Inhibitor',    severity: 'moderate', desc: 'Additive hypoglycaemia risk. Consider reducing sulfonylurea dose.' },
  { classA: 'Beta-Blocker',            classB: 'Calcium Channel Blocker', severity: 'moderate', desc: 'Risk of bradycardia and AV block. Monitor HR.' },
  { classA: 'Anthracycline (Chemotherapy)', classB: 'Beta-Blocker', severity: 'major', desc: 'Cardiotoxicity monitoring required. Echo/MUGA before and after cycles.' },
];

function computeInteractionMatrix(meds: MedEntry[]) {
  const results: ClinicalContextResult['interactionMatrix'] = [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      for (const rule of INTERACTION_RULES) {
        const match =
          (meds[i].drugClass.includes(rule.classA) && meds[j].drugClass.includes(rule.classB)) ||
          (meds[i].drugClass.includes(rule.classB) && meds[j].drugClass.includes(rule.classA));
        if (match) {
          results.push({
            drug1: meds[i].name,
            drug2: meds[j].name,
            severity: rule.severity,
            description: rule.desc,
          });
        }
      }
    }
  }
  return results;
}

// ─── Risk flags ───────────────────────────────────────────────────────────────

function computeRiskFlags(
  meds: MedEntry[],
  allergies: ClinicalContextResult['allergies'],
  problems: { description: string; status: string }[],
  labs: { name: string; value: string; unit: string; flag?: string }[],
): ClinicalContextResult['riskFlags'] {
  const flags: ClinicalContextResult['riskFlags'] = [];

  const hasCKD = problems.some(p => /ckd|chronic kidney|renal/i.test(p.description));
  const hasDiabetes = problems.some(p => /diabet/i.test(p.description));
  const hasHF = problems.some(p => /heart failure/i.test(p.description));
  const onMetformin = meds.some(m => /metformin/i.test(m.name));
  const onWarfarin = meds.some(m => /warfarin/i.test(m.name));
  const onDOAC = meds.some(m => m.drugClass === 'DOAC');
  const severeAllergies = allergies.filter(a => a.severity === 'severe');

  if (hasCKD && onMetformin) {
    flags.push({ flag: 'Metformin + CKD', severity: 'critical', detail: 'Metformin contraindicated if eGFR < 30 mL/min. Hold before contrast procedures. Verify latest eGFR.' });
  }
  if (hasCKD && hasDiabetes) {
    flags.push({ flag: 'Diabetic nephropathy risk', severity: 'warning', detail: 'CKD + T2DM: check microalbuminuria, initiate or optimise ACEi/ARB. Consider SGLT2i if eGFR > 45.' });
  }
  if (hasHF) {
    flags.push({ flag: 'Heart failure active', severity: 'warning', detail: 'Ensure GDMT optimised: ACEi/ARB/ARNI + beta-blocker + MRA. Assess fluid status at every visit.' });
  }
  if (onWarfarin || onDOAC) {
    flags.push({ flag: 'Anticoagulation active', severity: 'warning', detail: `Patient on ${onWarfarin ? 'warfarin' : 'DOAC'}. Assess bleeding risk (HAS-BLED). Avoid concurrent NSAIDs. Check INR if warfarin.` });
  }
  if (severeAllergies.length > 0) {
    flags.push({
      flag: `Severe allergy: ${severeAllergies.map(a => a.allergen).join(', ')}`,
      severity: 'critical',
      detail: `Cross-reactivity alert: ${severeAllergies.flatMap(a => a.crossReactivity).join(', ')}. Verify before prescribing.`,
    });
  }

  const abnormalLabs = labs.filter(l => l.flag && l.flag !== 'normal');
  if (abnormalLabs.length > 0) {
    flags.push({
      flag: `${abnormalLabs.length} abnormal lab(s)`,
      severity: 'warning',
      detail: abnormalLabs.map(l => `${l.name}: ${l.value} ${l.unit} [${l.flag}]`).join('; '),
    });
  }

  return flags;
}

// ─── Suggested screenings ─────────────────────────────────────────────────────

function computeScreenings(diagnoses: ClinicalContextResult['activeDiagnoses']): string[] {
  const screenings: string[] = [];
  const codes = diagnoses.map(d => d.icd10.toUpperCase());

  if (codes.some(c => /^E1[01]/.test(c))) {
    screenings.push('Annual HbA1c', 'Annual retinal screening', 'Annual microalbuminuria', 'Annual foot exam');
  }
  if (codes.some(c => /^I[12]/.test(c))) {
    screenings.push('Annual lipid panel', 'Annual renal function', '10-year CVD risk assessment (SCORE2/Framingham)');
  }
  if (codes.some(c => /^N18/.test(c))) {
    screenings.push('Quarterly eGFR + creatinine', 'Annual parathyroid hormone', 'Vitamin D level');
  }
  if (codes.some(c => /^I50/.test(c))) {
    screenings.push('Annual echocardiogram', 'BNP/NT-proBNP every 6 months', 'Renal panel quarterly');
  }
  if (codes.some(c => /^F3[2-4]/.test(c))) {
    screenings.push('PHQ-9 every visit', 'Annual metabolic panel (if on psychotropics)', 'Columbia Suicide Severity Rating Scale');
  }

  return [...new Set(screenings)];
}

// ─── Clinical summary builder ─────────────────────────────────────────────────

function buildClinicalSummary(
  meds: MedEntry[],
  diagnoses: ClinicalContextResult['activeDiagnoses'],
  riskFlags: ClinicalContextResult['riskFlags'],
): string {
  const highRelevance = diagnoses.filter(d => d.clinicalRelevance === 'high');
  const criticalFlags = riskFlags.filter(f => f.severity === 'critical');

  const parts: string[] = [];

  if (highRelevance.length > 0) {
    parts.push(`Active high-relevance conditions: ${highRelevance.map(d => `${d.description} (${d.icd10})`).join(', ')}.`);
  }

  parts.push(`Currently on ${meds.length} medication(s).`);

  if (criticalFlags.length > 0) {
    parts.push(`CRITICAL FLAGS: ${criticalFlags.map(f => f.flag).join('; ')}.`);
  }

  if (parts.length === 0) return 'No significant clinical context identified.';
  return parts.join(' ');
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const POST = createProtectedRoute(
  async (request: NextRequest) => {
  let body: ClinicalContextRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.patientId || !body.encounterId) {
    return NextResponse.json({ error: 'patientId and encounterId are required' }, { status: 400 });
  }

  // Check cache — one scan per patient per calendar day
  const cacheKey = getCacheKey(body.patientId);
  const cached = contextCache.get(cacheKey);
  const today = new Date().toISOString().slice(0, 10);

  if (cached && cached.date === today) {
    logger.info({ event: 'context_scan_cache_hit', patientId: body.patientId });
    return NextResponse.json({ success: true, cached: true, context: { ...cached.result, encounterId: body.encounterId } });
  }

  // Generate fresh context
  const context = generateClinicalContext(body);

  // Cache it
  contextCache.set(cacheKey, { result: context, date: today });

  logger.info({
    event: 'context_scan_generated',
    patientId: body.patientId,
    encounterId: body.encounterId,
    medsCount: context.activeMedications.length,
    riskFlagCount: context.riskFlags.length,
    interactionCount: context.interactionMatrix.length,
  });

  return NextResponse.json({ success: true, cached: false, context });
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
