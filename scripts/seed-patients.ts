// @ts-nocheck
/**
 * Seed Patients from Synthea (FHIR R4) JSON
 *
 * Usage (from repo root):
 *   pnpm --filter @holi/web exec tsx ../../scripts/seed-patients.ts --input ./synthea/output/fhir --limit 50
 *
 * Notes:
 * - This script expects Synthea-style FHIR Bundles (or individual FHIR resource JSON files).
 * - It ingests Patients + Diagnoses + a recent VitalSign snapshot and creates RiskScore rows.
 * - It is intended for demo/sandbox environments only.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import { PrismaClient, RiskScoreType } from '@prisma/client';
import { z } from 'zod';

type CliOptions = Readonly<{
  inputDir: string;
  limit: number;
  clinicianEmail: string | null;
  dryRun: boolean;
}>;

const prisma = new PrismaClient();

// -----------------------------
// Minimal FHIR schemas (R4)
// -----------------------------

const FhirCodingSchema = z.object({
  system: z.string().optional(),
  code: z.string().optional(),
  display: z.string().optional(),
});

const FhirCodeableConceptSchema = z.object({
  coding: z.array(FhirCodingSchema).optional(),
  text: z.string().optional(),
});

const FhirIdentifierSchema = z.object({
  system: z.string().optional(),
  value: z.string().optional(),
  type: z
    .object({
      coding: z.array(FhirCodingSchema).optional(),
      text: z.string().optional(),
    })
    .optional(),
});

const FhirHumanNameSchema = z.object({
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  text: z.string().optional(),
});

const FhirTelecomSchema = z.object({
  system: z.string().optional(), // phone|email
  value: z.string().optional(),
});

const FhirAddressSchema = z.object({
  line: z.array(z.string()).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const FhirPatientSchema = z.object({
  resourceType: z.literal('Patient'),
  id: z.string().optional(),
  identifier: z.array(FhirIdentifierSchema).optional(),
  name: z.array(FhirHumanNameSchema).optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(), // YYYY-MM-DD
  telecom: z.array(FhirTelecomSchema).optional(),
  address: z.array(FhirAddressSchema).optional(),
});

const FhirReferenceSchema = z.object({
  reference: z.string().optional(), // "Patient/<id>"
});

const FhirConditionSchema = z.object({
  resourceType: z.literal('Condition'),
  code: FhirCodeableConceptSchema.optional(),
  subject: FhirReferenceSchema.optional(),
  onsetDateTime: z.string().optional(),
});

const FhirQuantitySchema = z.object({
  value: z.number().optional(),
  unit: z.string().optional(),
  system: z.string().optional(),
  code: z.string().optional(),
});

const FhirObservationComponentSchema = z.object({
  code: FhirCodeableConceptSchema,
  valueQuantity: FhirQuantitySchema.optional(),
});

const FhirObservationSchema = z.object({
  resourceType: z.literal('Observation'),
  code: FhirCodeableConceptSchema.optional(),
  subject: FhirReferenceSchema.optional(),
  effectiveDateTime: z.string().optional(),
  valueQuantity: FhirQuantitySchema.optional(),
  component: z.array(FhirObservationComponentSchema).optional(),
  valueCodeableConcept: FhirCodeableConceptSchema.optional(),
});

const FhirBundleEntrySchema = z.object({
  resource: z.unknown(),
});

const FhirBundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  entry: z.array(FhirBundleEntrySchema).optional(),
});

type FhirPatient = z.infer<typeof FhirPatientSchema>;
type FhirCondition = z.infer<typeof FhirConditionSchema>;
type FhirObservation = z.infer<typeof FhirObservationSchema>;

type ExtractedVitals = Readonly<{
  systolicBP?: number;
  diastolicBP?: number;
  heightCm?: number;
  weightKg?: number;
  tobaccoUse?: boolean;
}>;

type ExtractedComorbidities = Readonly<{
  hasHypertension: boolean;
  hasType2Diabetes: boolean;
  tobaccoUse: boolean;
  hasObesity: boolean;
  icd10: ReadonlyArray<Readonly<{ code: string; description: string; snomed?: string }>>;
}>;

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, 'true');
    }
  }

  const inputDir = args.get('input') ?? '';
  if (!inputDir) {
    throw new Error('Missing --input <dir> (Synthea FHIR output directory)');
  }

  const limit = Number(args.get('limit') ?? '50');
  const clinicianEmail = args.get('clinicianEmail') ?? null;
  const dryRun = args.get('dryRun') === 'true';

  if (!Number.isFinite(limit) || limit < 1 || limit > 5000) {
    throw new Error('--limit must be between 1 and 5000');
  }

  return { inputDir, limit, clinicianEmail, dryRun };
}

function getRepoRoot(): string {
  // script lives at <repo>/scripts/seed-patients.ts
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), '..');
}

function computeAgeYears(birthDateIso: string): number {
  const birth = new Date(birthDateIso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, Math.min(120, age));
}

function computeAgeBand(ageYears: number): string {
  const a = Math.max(0, Math.min(120, Math.floor(ageYears)));
  const bucket = Math.floor(a / 10) * 10;
  const next = bucket + 9;
  return `${bucket}-${next}`;
}

function pickMrn(patient: FhirPatient): string {
  const identifiers = patient.identifier ?? [];
  for (const id of identifiers) {
    const code = id.type?.coding?.[0]?.code ?? id.type?.text;
    if (code && String(code).toUpperCase().includes('MR') && id.value) {
      return id.value;
    }
    if (id.system && id.system.toLowerCase().includes('mrn') && id.value) {
      return id.value;
    }
  }
  // Deterministic fallback based on patient.id (still synthetic)
  const suffix = (patient.id ?? cryptoRandom(12)).slice(0, 12);
  return `MRN-SYN-${suffix}`;
}

function cryptoRandom(len: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function tokenIdFromMrn(mrn: string): string {
  // Stable, non-PII token for demo search
  const base = mrn.replace(/[^a-zA-Z0-9]/g, '').slice(-12);
  return `PT-${base || cryptoRandom(12)}`;
}

function normalizeSex(gender?: string): 'M' | 'F' | 'U' {
  const g = (gender ?? '').toLowerCase();
  if (g === 'male' || g === 'm') return 'M';
  if (g === 'female' || g === 'f') return 'F';
  return 'U';
}

function getPatientName(p: FhirPatient): { firstName: string; lastName: string } {
  const name = (p.name ?? [])[0];
  const given = name?.given?.[0] ?? '';
  const family = name?.family ?? '';
  const fallback = name?.text ?? 'Synthetic Patient';
  const rawFirstName = given || fallback.split(' ')[0] || 'Synthetic';
  const rawLastName = family || fallback.split(' ').slice(1).join(' ') || 'Patient';

  // Synthea demo data often appends digits to names (e.g., "Nannette779").
  // Strip digits to keep the demo UI realistic and readable.
  const scrub = (s: string) =>
    s
      .split(/\s+/)
      .map((part) => part.replace(/\d+/g, ''))
      .filter(Boolean)
      .join(' ')
      .trim() || 'Synthetic';

  return {
    firstName: scrub(rawFirstName),
    lastName: scrub(rawLastName) || 'Patient',
  };
}

function getTelecom(p: FhirPatient): { email?: string; phone?: string } {
  const telecom = p.telecom ?? [];
  const email = telecom.find(t => t.system === 'email')?.value;
  const phone = telecom.find(t => t.system === 'phone')?.value;
  return { email, phone };
}

function getAddress(p: FhirPatient): { address?: string; city?: string; state?: string; postalCode?: string; country?: string } {
  const a = (p.address ?? [])[0];
  const address = (a?.line ?? []).join(', ') || undefined;
  return {
    address,
    city: a?.city,
    state: a?.state,
    postalCode: a?.postalCode,
    country: a?.country,
  };
}

function getCodingStrings(concept?: z.infer<typeof FhirCodeableConceptSchema>): string[] {
  const codes = concept?.coding ?? [];
  const out: string[] = [];
  for (const c of codes) {
    if (c.code) out.push(c.code);
    if (c.display) out.push(c.display);
  }
  if (concept?.text) out.push(concept.text);
  return out.map(s => s.toLowerCase());
}

function extractComorbidities(conditions: readonly FhirCondition[]): ExtractedComorbidities {
  const icd10: Array<{ code: string; description: string; snomed?: string }> = [];

  let hasHypertension = false;
  let hasType2Diabetes = false;
  let tobaccoUse = false;
  let hasObesity = false;

  for (const c of conditions) {
    const strings = getCodingStrings(c.code);
    // Detect via ICD-10 patterns or text matching (Synthea often includes ICD-10-CM).
    const icd = (c.code?.coding ?? []).find(cd => (cd.system ?? '').includes('icd-10') || (cd.system ?? '').includes('icd10'));
    const snomed = (c.code?.coding ?? []).find(cd => (cd.system ?? '').toLowerCase().includes('snomed'));

    const icdCode = icd?.code;
    const desc = icd?.display ?? snomed?.display ?? c.code?.text ?? 'Condition';

    if (icdCode) icd10.push({ code: icdCode, description: desc, snomed: snomed?.code });

    if (icdCode?.startsWith('I10') || strings.some(s => s.includes('hypertension'))) {
      hasHypertension = true;
    }
    if (icdCode?.startsWith('E11') || strings.some(s => s.includes('type 2 diabetes') || s.includes('diabetes mellitus type 2'))) {
      hasType2Diabetes = true;
    }
    if (strings.some(s => s.includes('tobacco') || s.includes('smoker') || s.includes('nicotine'))) {
      tobaccoUse = true;
    }
    if (icdCode?.startsWith('E66') || strings.some(s => s.includes('obesity'))) {
      hasObesity = true;
    }
  }

  return { hasHypertension, hasType2Diabetes, tobaccoUse, hasObesity, icd10 };
}

function extractVitals(observations: readonly FhirObservation[]): ExtractedVitals {
  let systolicBP: number | undefined;
  let diastolicBP: number | undefined;
  let heightCm: number | undefined;
  let weightKg: number | undefined;
  let tobaccoUse: boolean | undefined;

  // Choose the most recent measurement per type when possible.
  const sorted = [...observations].sort((a, b) => {
    const ta = a.effectiveDateTime ? Date.parse(a.effectiveDateTime) : 0;
    const tb = b.effectiveDateTime ? Date.parse(b.effectiveDateTime) : 0;
    return tb - ta;
  });

  for (const o of sorted) {
    const codes = getCodingStrings(o.code);

    // Smoking status (Synthea often uses LOINC 72166-2 + valueCodeableConcept)
    if (tobaccoUse === undefined && codes.some(s => s.includes('72166-2') || s.includes('smoking'))) {
      const v = getCodingStrings(o.valueCodeableConcept);
      if (v.some(s => s.includes('never'))) tobaccoUse = false;
      else if (v.some(s => s.includes('current') || s.includes('every day') || s.includes('some days'))) tobaccoUse = true;
    }

    // Height (LOINC 8302-2), Weight (LOINC 29463-7)
    if (heightCm === undefined && codes.some(s => s.includes('8302-2') || s.includes('body height'))) {
      const val = o.valueQuantity?.value;
      if (typeof val === 'number') heightCm = val;
    }
    if (weightKg === undefined && codes.some(s => s.includes('29463-7') || s.includes('body weight'))) {
      const val = o.valueQuantity?.value;
      if (typeof val === 'number') weightKg = val;
    }

    // Blood pressure panel (LOINC 85354-9) with components (8480-6 systolic, 8462-4 diastolic)
    if ((systolicBP === undefined || diastolicBP === undefined) && codes.some(s => s.includes('85354-9') || s.includes('blood pressure'))) {
      for (const comp of o.component ?? []) {
        const cc = getCodingStrings(comp.code);
        if (systolicBP === undefined && cc.some(s => s.includes('8480-6') || s.includes('systolic'))) {
          const v = comp.valueQuantity?.value;
          if (typeof v === 'number') systolicBP = Math.round(v);
        }
        if (diastolicBP === undefined && cc.some(s => s.includes('8462-4') || s.includes('diastolic'))) {
          const v = comp.valueQuantity?.value;
          if (typeof v === 'number') diastolicBP = Math.round(v);
        }
      }
    }
  }

  return { systolicBP, diastolicBP, heightCm, weightKg, tobaccoUse };
}

function computeBmi(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg) return undefined;
  const hM = heightCm / 100;
  if (hM <= 0) return undefined;
  const bmi = weightKg / (hM * hM);
  if (!Number.isFinite(bmi)) return undefined;
  return Math.round(bmi * 10) / 10;
}

function deriveSeedRiskScoresForDb(facts: {
  ageYears: number;
  hasHypertension: boolean;
  hasType2Diabetes: boolean;
  tobaccoUse: boolean;
  bmi?: number;
  systolicBP?: number;
  diastolicBP?: number;
}): Array<{
  riskType: RiskScoreType;
  algorithmVersion: string;
  score: number;
  scorePercentage: string;
  category: string;
  inputData: object;
  recommendation: string;
  nextSteps: string[];
  clinicalEvidence: string[];
}> {
  // Keep deterministic values (no randomness) based on facts
  const age = Math.max(0, Math.min(120, Math.round(facts.ageYears)));
  const systolic = facts.systolicBP ?? (facts.hasHypertension ? 145 : 122);
  const diastolic = facts.diastolicBP ?? (facts.hasHypertension ? 92 : 78);
  const bmi = facts.bmi;
  const obese = typeof bmi === 'number' ? bmi >= 30 : false;

  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const baseAscvd = 0.03;
  const ageFactor = Math.max(0, (age - 40) * 0.005);
  const htnFactor = facts.hasHypertension ? 0.06 : 0.0;
  const dmFactor = facts.hasType2Diabetes ? 0.08 : 0.0;
  const tobaccoFactor = facts.tobaccoUse ? 0.06 : 0.0;
  const obesityFactor = obese ? 0.03 : 0.0;
  const bpFactor = systolic >= 140 || diastolic >= 90 ? 0.02 : 0.0;
  const ascvd = clamp01(baseAscvd + ageFactor + htnFactor + dmFactor + tobaccoFactor + obesityFactor + bpFactor);
  const ascvdPct = `${(ascvd * 100).toFixed(1)}%`;
  const ascvdCategory = ascvd >= 0.20 ? 'High' : ascvd >= 0.075 ? 'Moderate' : 'Low';

  const diabetesScore = facts.hasType2Diabetes ? 0.85 : obese || facts.tobaccoUse ? 0.35 : 0.12;
  const diabetesCategory = diabetesScore >= 0.75 ? 'Very High' : diabetesScore >= 0.45 ? 'High' : diabetesScore >= 0.2 ? 'Moderate' : 'Low';

  const htnScore = systolic >= 160 || diastolic >= 100 ? 0.85 : systolic >= 140 || diastolic >= 90 ? 0.65 : 0.18;
  const htnCategory = htnScore >= 0.75 ? 'High' : htnScore >= 0.4 ? 'Moderate' : 'Low';

  return [
    {
      riskType: RiskScoreType.ASCVD,
      algorithmVersion: 'ASCVD-DEMO-HEURISTIC-v1',
      score: ascvd,
      scorePercentage: ascvdPct,
      category: ascvdCategory,
      inputData: {
        ageYears: age,
        systolicBP: systolic,
        diastolicBP: diastolic,
        bmi: bmi ?? null,
        tobaccoUse: facts.tobaccoUse,
        hasHypertension: facts.hasHypertension,
        hasType2Diabetes: facts.hasType2Diabetes,
      },
      recommendation:
        ascvdCategory === 'High'
          ? 'High cardiovascular risk. Optimize BP control, address tobacco use, and consider statin therapy per guidelines.'
          : 'Continue preventive care: maintain healthy lifestyle and reassess risk periodically.',
      nextSteps: [
        'Confirm BP with repeat measurements',
        'Assess lipid profile and HbA1c as indicated',
        facts.tobaccoUse ? 'Offer tobacco cessation support' : 'Reinforce avoidance of tobacco exposure',
      ],
      clinicalEvidence: [
        'ACC/AHA Primary Prevention Guideline (2019)',
        'ACC/AHA Cholesterol Guideline (2018)',
      ],
    },
    {
      riskType: RiskScoreType.DIABETES,
      algorithmVersion: 'DIABETES-DEMO-HEURISTIC-v1',
      score: clamp01(diabetesScore),
      scorePercentage: `${(clamp01(diabetesScore) * 100).toFixed(1)}%`,
      category: diabetesCategory,
      inputData: { ageYears: age, bmi: bmi ?? null, tobaccoUse: facts.tobaccoUse, hasType2Diabetes: facts.hasType2Diabetes },
      recommendation:
        facts.hasType2Diabetes
          ? 'Type 2 diabetes present. Optimize glycemic control and risk-factor management.'
          : 'Routine screening and healthy lifestyle counseling.',
      nextSteps: [
        'Check HbA1c and fasting glucose as appropriate',
        obese ? 'Recommend weight management plan' : 'Encourage regular physical activity',
      ],
      clinicalEvidence: ['ADA Standards of Care in Diabetes (annual update)'],
    },
    {
      riskType: RiskScoreType.HYPERTENSION,
      algorithmVersion: 'HTN-DEMO-HEURISTIC-v1',
      score: clamp01(htnScore),
      scorePercentage: `${(clamp01(htnScore) * 100).toFixed(1)}%`,
      category: htnCategory,
      inputData: { systolicBP: systolic, diastolicBP: diastolic, hasHypertension: facts.hasHypertension },
      recommendation: htnCategory === 'High' ? 'Hypertension likely. Confirm with repeat readings and initiate guideline-directed therapy.' : 'Monitor BP and reinforce lifestyle modifications.',
      nextSteps: ['Repeat BP measurements (proper cuff size, seated, rested)', 'Counsel on sodium reduction and activity'],
      clinicalEvidence: ['ACC/AHA Hypertension Guideline (2017)'],
    },
  ];
}

function refToPatientId(ref?: string): string | null {
  if (!ref) return null;
  const m = ref.match(/^Patient\/(.+)$/);
  return m ? m[1] : null;
}

async function readJsonFiles(inputDir: string): Promise<unknown[]> {
  const entries = await readdir(inputDir, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.json'))
    .map(e => path.join(inputDir, e.name));

  const out: unknown[] = [];
  for (const f of files) {
    const txt = await readFile(f, 'utf-8');
    out.push(JSON.parse(txt) as unknown);
  }
  return out;
}

function flattenResources(doc: unknown): unknown[] {
  const bundle = FhirBundleSchema.safeParse(doc);
  if (bundle.success) {
    const entries = bundle.data.entry ?? [];
    return entries.map(e => e.resource);
  }
  return [doc];
}

async function main() {
  // Load env from apps/web so DATABASE_URL works when running from repo root.
  loadEnvConfig(path.join(getRepoRoot(), 'apps/web'));

  const opts = parseArgs(process.argv);
  const inputDir = path.isAbsolute(opts.inputDir) ? opts.inputDir : path.join(getRepoRoot(), opts.inputDir);

  const rawDocs = await readJsonFiles(inputDir);
  const resources = rawDocs.flatMap(flattenResources);

  const patients: Array<{ patient: FhirPatient; patientKey: string }> = [];
  const conditionsByPatient = new Map<string, FhirCondition[]>();
  const observationsByPatient = new Map<string, FhirObservation[]>();

  for (const r of resources) {
    const p = FhirPatientSchema.safeParse(r);
    if (p.success) {
      const key = p.data.id ?? `synthetic-${patients.length}`;
      patients.push({ patient: p.data, patientKey: key });
      continue;
    }

    const c = FhirConditionSchema.safeParse(r);
    if (c.success) {
      const pid = refToPatientId(c.data.subject?.reference);
      if (pid) {
        const list = conditionsByPatient.get(pid) ?? [];
        list.push(c.data);
        conditionsByPatient.set(pid, list);
      }
      continue;
    }

    const o = FhirObservationSchema.safeParse(r);
    if (o.success) {
      const pid = refToPatientId(o.data.subject?.reference);
      if (pid) {
        const list = observationsByPatient.get(pid) ?? [];
        list.push(o.data);
        observationsByPatient.set(pid, list);
      }
      continue;
    }
  }

  if (patients.length === 0) {
    throw new Error(`No FHIR Patient resources found in ${inputDir}`);
  }

  const limit = Math.min(opts.limit, patients.length);
  console.log(`Found ${patients.length} FHIR patients. Seeding ${limit}...`);

  const clinicianId = await resolveClinicianId(opts.clinicianEmail);

  let created = 0;
  for (const { patient, patientKey } of patients.slice(0, limit)) {
    const mrn = pickMrn(patient);
    const tokenId = tokenIdFromMrn(mrn);
    const { firstName, lastName } = getPatientName(patient);
    const sex = normalizeSex(patient.gender);
    const birthDateIso = patient.birthDate ? `${patient.birthDate}T00:00:00.000Z` : '1980-01-01T00:00:00.000Z';
    const ageYears = computeAgeYears(birthDateIso);
    const ageBand = computeAgeBand(ageYears);
    const telecom = getTelecom(patient);
    const addr = getAddress(patient);

    const conditions = conditionsByPatient.get(patientKey) ?? [];
    const observations = observationsByPatient.get(patientKey) ?? [];

    const comorb = extractComorbidities(conditions);
    const vitals = extractVitals(observations);
    const bmi = computeBmi(vitals.heightCm, vitals.weightKg);
    const tobacco = vitals.tobaccoUse ?? comorb.tobaccoUse;

    const flaggedConcerns: string[] = [];
    if (tobacco) flaggedConcerns.push('Tobacco Use');
    if (comorb.hasHypertension) flaggedConcerns.push('Hypertension Risk');
    if (comorb.hasType2Diabetes) flaggedConcerns.push('Diabetes Risk');
    if (typeof bmi === 'number' && bmi >= 30) flaggedConcerns.push('Obesity Risk');

    const riskScores = deriveSeedRiskScoresForDb({
      ageYears,
      hasHypertension: comorb.hasHypertension,
      hasType2Diabetes: comorb.hasType2Diabetes,
      tobaccoUse: tobacco,
      bmi,
      systolicBP: vitals.systolicBP,
      diastolicBP: vitals.diastolicBP,
    });

    if (opts.dryRun) {
      created++;
      continue;
    }

    const dbPatient = await prisma.patient.upsert({
      where: { mrn },
      update: {
        firstName,
        lastName,
        dateOfBirth: new Date(birthDateIso),
        gender: sex,
        email: telecom.email ?? null,
        phone: telecom.phone ?? null,
        address: addr.address ?? null,
        city: addr.city ?? null,
        state: addr.state ?? null,
        postalCode: addr.postalCode ?? null,
        country: addr.country ?? 'MX',
        tokenId,
        ageBand,
        assignedClinicianId: clinicianId,
        tobaccoUse: tobacco,
        heightCm: vitals.heightCm ?? null,
        weightKg: vitals.weightKg ?? null,
        bmi: bmi ?? null,
        flaggedConcerns,
      },
      create: {
        firstName,
        lastName,
        dateOfBirth: new Date(birthDateIso),
        gender: sex,
        email: telecom.email ?? null,
        phone: telecom.phone ?? null,
        address: addr.address ?? null,
        city: addr.city ?? null,
        state: addr.state ?? null,
        postalCode: addr.postalCode ?? null,
        country: addr.country ?? 'MX',
        mrn,
        tokenId,
        ageBand,
        assignedClinicianId: clinicianId,
        tobaccoUse: tobacco,
        heightCm: vitals.heightCm ?? null,
        weightKg: vitals.weightKg ?? null,
        bmi: bmi ?? null,
        flaggedConcerns,
      },
    });

    // Diagnoses
    if (comorb.icd10.length > 0) {
      await prisma.diagnosis.createMany({
        data: comorb.icd10.map(d => ({
          patientId: dbPatient.id,
          icd10Code: d.code,
          description: d.description,
          snomedCode: d.snomed ?? null,
          severity: null,
          isPrimary: false,
          status: 'CHRONIC',
          onsetDate: null,
          diagnosedBy: clinicianId,
          notes: 'Imported from synthetic FHIR bundle (Synthea).',
        })),
        skipDuplicates: true,
      });
    }

    // Vital snapshot
    if (vitals.systolicBP !== undefined || vitals.diastolicBP !== undefined || vitals.heightCm !== undefined || vitals.weightKg !== undefined) {
      await prisma.vitalSign.create({
        data: {
          patientId: dbPatient.id,
          systolicBP: vitals.systolicBP ?? null,
          diastolicBP: vitals.diastolicBP ?? null,
          height: vitals.heightCm ?? null,
          weight: vitals.weightKg ?? null,
          source: 'IMPORT',
          recordedBy: clinicianId,
        },
      });
    }

    // Risk scores
    await prisma.riskScore.createMany({
      data: riskScores.map(rs => ({
        patientId: dbPatient.id,
        riskType: rs.riskType,
        algorithmVersion: rs.algorithmVersion,
        score: rs.score,
        scorePercentage: rs.scorePercentage,
        category: rs.category,
        riskPercentile: null,
        inputData: rs.inputData,
        recommendation: rs.recommendation,
        nextSteps: rs.nextSteps,
        uspstfGrade: null,
        treatmentTarget: null,
        clinicalEvidence: rs.clinicalEvidence,
        dppEligible: rs.riskType === RiskScoreType.DIABETES ? !comorb.hasType2Diabetes && (bmi ?? 0) >= 30 : null,
        dppExpectedOutcome: null,
        metforminRecommended: null,
        metforminRationale: null,
      })),
      skipDuplicates: false,
    });

    created++;
    if (created % 10 === 0) console.log(`Seeded ${created}/${limit} patients...`);
  }

  console.log(`✅ Seed complete. Seeded ${created} patients.`);
}

async function resolveClinicianId(email: string | null): Promise<string | null> {
  if (email) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!u) throw new Error(`No clinician found for --clinicianEmail ${email}`);
    return u.id;
  }

  // Prefer demo clinician if present
  const demo = await prisma.user.findFirst({
    where: { email: { in: ['demo-clinician@holilabs.xyz', 'doctor@holilabs.com'] } },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  });
  if (demo) {
    console.log(`Assigning patients to clinician ${demo.email}`);
    return demo.id;
  }

  // Allow unassigned (GlobalSearch does not filter by clinician)
  console.warn('No clinician found; patients will be unassigned (assignedClinicianId=null).');
  return null;
}

main()
  .catch(async (e) => {
    console.error('❌ seed-patients failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .then(async () => {
    await prisma.$disconnect();
  });


