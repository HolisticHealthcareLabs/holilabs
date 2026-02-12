/**
 * SEED MASTER DATA — "The Brain"
 *
 * Seeds configuration-only data into a clean database.
 * Zero patients. Zero transactions. Pure clinical intelligence.
 *
 * Contents:
 *   1. Clinical Rules (DOAC safety, contraindications, interactions, dosing)
 *   2. TUSS/CBHPM Billing Codes (Bolivia + Brazil)
 *   3. ICD-10 Reference Codes
 *   4. Medication Concepts (DOAC registry)
 *   5. Feature Flags (production defaults)
 *   6. Appointment Type Configs
 *   7. Notification Templates
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/seed-master-data.ts
 *
 * Prerequisites:
 *   - DATABASE_URL set in apps/web/.env (local dev DB)
 *   - Prisma migrations applied: pnpm exec prisma migrate deploy
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Sentinel value for global (non-clinic-scoped) records.
// Prisma can't match NULL in composite unique constraints (SQL NULL != NULL),
// so we use a non-null string to satisfy @@unique([ruleId, clinicId]) and
// @@unique([name, clinicId]) on ClinicalRule and FeatureFlag respectively.
const GLOBAL_CLINIC_ID = 'GLOBAL';

// ---------------------------------------------------------------------------
// 1. CLINICAL RULES
// ---------------------------------------------------------------------------

async function seedClinicalRules() {
  console.log('\n--- Seeding Clinical Rules ---');

  // Read from consolidated master data file (produced by extract-master-data.ts)
  const masterRulesPath = path.resolve(__dirname, '../data/master/rules.json');

  if (!fs.existsSync(masterRulesPath)) {
    // Fallback: read from original source files if master data not yet extracted
    console.warn('  WARN: data/master/rules.json not found. Falling back to source files.');
    return seedClinicalRulesFromSources();
  }

  const masterFile = JSON.parse(fs.readFileSync(masterRulesPath, 'utf-8'));
  const rules = masterFile.rules;

  console.log(`  Source: data/master/rules.json (v${masterFile.version}, PII: ${masterFile.piiScanResult})`);

  let totalRules = 0;

  for (const rule of rules) {
    const ruleId = rule.ruleId;
    const category = rule._sourceCategory || rule.domain || 'GENERAL';

    await prisma.clinicalRule.upsert({
      where: { ruleId_clinicId: { ruleId, clinicId: GLOBAL_CLINIC_ID } },
      update: {
        name: rule.name || ruleId,
        category,
        logic: rule.logic || {
          condition: rule.condition,
          medication: rule.medication,
          severity: rule.severity,
          rationale: rule.rationale,
        },
        description: rule.rationale || rule.intervention?.message || '',
        isActive: true,
        version: 1,
      },
      create: {
        ruleId,
        name: rule.name || ruleId,
        category,
        logic: rule.logic || {
          condition: rule.condition,
          medication: rule.medication,
          severity: rule.severity,
          rationale: rule.rationale,
        },
        description: rule.rationale || rule.intervention?.message || '',
        priority: rule.severity === 'BLOCK' ? 100 : rule.severity === 'FLAG' ? 50 : 10,
        isActive: true,
        version: 1,
        clinicId: GLOBAL_CLINIC_ID,
      },
    });
    totalRules++;
  }

  console.log(`  TOTAL: ${totalRules} clinical rules seeded`);
  return totalRules;
}

/** Fallback: read from individual source files (pre-extraction path) */
async function seedClinicalRulesFromSources() {
  const dataDir = path.resolve(__dirname, '../data/clinical/sources');

  const ruleFiles = [
    { file: 'doac-rules.json', category: 'DOAC_SAFETY' },
    { file: 'contraindications-v1.json', category: 'CONTRAINDICATION' },
    { file: 'interactions-v1.json', category: 'INTERACTION' },
    { file: 'dosing-v1.json', category: 'DOSING' },
  ];

  let totalRules = 0;

  for (const { file, category } of ruleFiles) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${file} not found at ${filePath}`);
      continue;
    }

    const rules = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const rule of rules) {
      const ruleId = rule.ruleId;

      await prisma.clinicalRule.upsert({
        where: { ruleId_clinicId: { ruleId, clinicId: GLOBAL_CLINIC_ID } },
        update: {
          name: rule.name || ruleId,
          category,
          logic: rule.logic || {
            condition: rule.condition,
            medication: rule.medication,
            severity: rule.severity,
            rationale: rule.rationale,
          },
          description: rule.rationale || rule.intervention?.message || '',
          isActive: true,
          version: 1,
        },
        create: {
          ruleId,
          name: rule.name || ruleId,
          category,
          logic: rule.logic || {
            condition: rule.condition,
            medication: rule.medication,
            severity: rule.severity,
            rationale: rule.rationale,
          },
          description: rule.rationale || rule.intervention?.message || '',
          priority: rule.severity === 'BLOCK' ? 100 : rule.severity === 'FLAG' ? 50 : 10,
          isActive: true,
          version: 1,
          clinicId: GLOBAL_CLINIC_ID,
        },
      });
      totalRules++;
    }

    console.log(`  ${file}: ${rules.length} rules loaded (category: ${category})`);
  }

  console.log(`  TOTAL: ${totalRules} clinical rules seeded (from source files)`);
  return totalRules;
}

// ---------------------------------------------------------------------------
// 2. TUSS / CBHPM BILLING CODES
// ---------------------------------------------------------------------------

interface BillingCode {
  code: string;
  description: string;
  category: string;
  baseRateBOB: number;
  baseRateBRL: number | null;
  applicableSeverities: string[];
}

const BILLING_CODES: BillingCode[] = [
  // Bolivia TUSS codes (validated by Victor Mercado, VP Finance)
  {
    code: '4.01.01.01',
    description: 'Specialized Consultation — High Complexity',
    category: 'SPECIALIZED',
    baseRateBOB: 4500,
    baseRateBRL: null,
    applicableSeverities: ['BLOCK'],
  },
  {
    code: '4.01.01.02',
    description: 'Specialized Drug Interaction Review',
    category: 'SPECIALIZED',
    baseRateBOB: 3750,
    baseRateBRL: null,
    applicableSeverities: ['FLAG'],
  },
  {
    code: '4.01.01.03',
    description: 'Specialized Consultation — Data Completion',
    category: 'SPECIALIZED',
    baseRateBOB: 3000,
    baseRateBRL: null,
    applicableSeverities: ['ATTESTATION_REQUIRED'],
  },
  {
    code: '1.01.01.01',
    description: 'Standard Visit — Low Complexity',
    category: 'STANDARD',
    baseRateBOB: 1250,
    baseRateBRL: null,
    applicableSeverities: ['PASS'],
  },
  // Brazil CBHPM codes (for future market expansion)
  {
    code: '1.01.01.09-6',
    description: 'Consulta em Consultório — Clínico Geral',
    category: 'STANDARD',
    baseRateBOB: 0,
    baseRateBRL: 189,
    applicableSeverities: ['PASS'],
  },
  {
    code: '1.01.01.15-0',
    description: 'Consulta em Consultório — Especialista',
    category: 'SPECIALIZED',
    baseRateBOB: 0,
    baseRateBRL: 315,
    applicableSeverities: ['BLOCK', 'FLAG'],
  },
];

async function seedBillingCodes() {
  console.log('\n--- Seeding Billing Codes (TUSS/CBHPM) ---');

  // Store as feature flags since we don't have a dedicated billing codes table.
  // These will be read by the billing engine at runtime.
  for (const code of BILLING_CODES) {
    await prisma.featureFlag.upsert({
      where: {
        name_clinicId: {
          name: `billing.code.${code.code}`,
          clinicId: GLOBAL_CLINIC_ID,
        },
      },
      update: {
        description: JSON.stringify(code),
        enabled: true,
      },
      create: {
        name: `billing.code.${code.code}`,
        description: JSON.stringify(code),
        enabled: true,
        clinicId: GLOBAL_CLINIC_ID,
        reason: 'Master data seed — billing code registry',
      },
    });
  }

  console.log(`  ${BILLING_CODES.length} billing codes seeded`);
  return BILLING_CODES.length;
}

// ---------------------------------------------------------------------------
// 3. ICD-10 REFERENCE CODES
// ---------------------------------------------------------------------------

const ICD10_CORE_CODES = [
  // Cardiovascular (DOAC primary indications)
  { code: 'I48.0', description: 'Paroxysmal atrial fibrillation', chapter: 'IX', category: 'I48', billable: true },
  { code: 'I48.1', description: 'Persistent atrial fibrillation', chapter: 'IX', category: 'I48', billable: true },
  { code: 'I48.2', description: 'Chronic atrial fibrillation', chapter: 'IX', category: 'I48', billable: true },
  { code: 'I48.91', description: 'Unspecified atrial fibrillation', chapter: 'IX', category: 'I48', billable: true },
  { code: 'I26.99', description: 'Other pulmonary embolism without acute cor pulmonale', chapter: 'IX', category: 'I26', billable: true },
  { code: 'I82.40', description: 'Acute embolism and thrombosis of unspecified deep veins of lower extremity', chapter: 'IX', category: 'I82', billable: true },
  { code: 'I10', description: 'Essential (primary) hypertension', chapter: 'IX', category: 'I10', billable: true },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery', chapter: 'IX', category: 'I25', billable: true },

  // Renal (DOAC dosing drivers)
  { code: 'N18.3', description: 'Chronic kidney disease, stage 3', chapter: 'XIV', category: 'N18', billable: true },
  { code: 'N18.4', description: 'Chronic kidney disease, stage 4', chapter: 'XIV', category: 'N18', billable: true },
  { code: 'N18.5', description: 'Chronic kidney disease, stage 5', chapter: 'XIV', category: 'N18', billable: true },
  { code: 'N18.6', description: 'End stage renal disease', chapter: 'XIV', category: 'N18', billable: true },
  { code: 'N17.9', description: 'Acute kidney failure, unspecified', chapter: 'XIV', category: 'N17', billable: true },

  // Endocrine/metabolic (common comorbidities)
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', chapter: 'IV', category: 'E11', billable: true },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', chapter: 'IV', category: 'E78', billable: true },

  // Bleeding risk (DOAC monitoring)
  { code: 'K92.2', description: 'Gastrointestinal hemorrhage, unspecified', chapter: 'XI', category: 'K92', billable: true },
  { code: 'D68.9', description: 'Coagulation defect, unspecified', chapter: 'III', category: 'D68', billable: true },
  { code: 'R58', description: 'Hemorrhage, not elsewhere classified', chapter: 'XVIII', category: 'R58', billable: true },

  // Encounter codes (administrative)
  { code: 'Z51.81', description: 'Encounter for therapeutic drug level monitoring', chapter: 'XXI', category: 'Z51', billable: true },
  { code: 'Z79.01', description: 'Long term (current) use of anticoagulants', chapter: 'XXI', category: 'Z79', billable: true },
  { code: 'Z00.00', description: 'Encounter for general adult medical examination', chapter: 'XXI', category: 'Z00', billable: true },
];

async function seedICD10Codes() {
  console.log('\n--- Seeding ICD-10 Reference Codes ---');

  // ICD10Code model may not exist in the Prisma schema
  if (!(prisma as any).iCD10Code) {
    console.warn('  SKIP: ICD10Code model not available in Prisma client');
    return 0;
  }

  let count = 0;
  for (const icd of ICD10_CORE_CODES) {
    try {
      await (prisma as any).iCD10Code.upsert({
        where: { code: icd.code },
        update: {
          description: icd.description,
          chapter: icd.chapter,
          category: icd.category,
          billable: icd.billable,
        },
        create: icd,
      });
      count++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('does not exist') || msg.includes('relation')) {
        console.warn('  SKIP: ICD10Code table not available in this database');
        return 0;
      }
      throw e;
    }
  }

  console.log(`  ${count} ICD-10 codes seeded`);
  return count;
}

// ---------------------------------------------------------------------------
// 4. MEDICATION CONCEPTS (DOAC Registry)
// ---------------------------------------------------------------------------

interface MedicationConcept {
  genericName: string;
  brandNames: string[];
  rxnormCode: string;
  atcCode: string;
  standardDoses: string[];
  renalThresholds: { block: number; doseReduce: number | null };
  metabolismPathway: string;
  halfLifeHours: string;
  reversal: string;
}

const DOAC_REGISTRY: MedicationConcept[] = [
  {
    genericName: 'rivaroxaban',
    brandNames: ['Xarelto'],
    rxnormCode: '1114195',
    atcCode: 'B01AF01',
    standardDoses: ['20mg QD', '15mg QD (CrCl 15-50)', '10mg QD (VTE prophylaxis)'],
    renalThresholds: { block: 15, doseReduce: 50 },
    metabolismPathway: 'CYP3A4/P-gp',
    halfLifeHours: '5-9',
    reversal: 'Andexanet alfa (Andexxa)',
  },
  {
    genericName: 'apixaban',
    brandNames: ['Eliquis'],
    rxnormCode: '1364430',
    atcCode: 'B01AF02',
    standardDoses: ['5mg BID', '2.5mg BID (dose-reduced)'],
    renalThresholds: { block: 15, doseReduce: 25 },
    metabolismPathway: 'CYP3A4/P-gp',
    halfLifeHours: '8-15',
    reversal: 'Andexanet alfa (Andexxa)',
  },
  {
    genericName: 'edoxaban',
    brandNames: ['Savaysa', 'Lixiana'],
    rxnormCode: '1599538',
    atcCode: 'B01AF03',
    standardDoses: ['60mg QD', '30mg QD (dose-reduced for CrCl 15-50 or weight ≤60kg)'],
    renalThresholds: { block: 15, doseReduce: 50 },
    metabolismPathway: 'P-gp (minimal CYP)',
    halfLifeHours: '10-14',
    reversal: 'Andexanet alfa (off-label)',
  },
  {
    genericName: 'dabigatran',
    brandNames: ['Pradaxa'],
    rxnormCode: '1037042',
    atcCode: 'B01AE07',
    standardDoses: ['150mg BID', '110mg BID (age ≥80 or high bleeding risk)', '75mg BID (CrCl 15-30)'],
    renalThresholds: { block: 15, doseReduce: 30 },
    metabolismPathway: 'P-gp (not CYP-dependent)',
    halfLifeHours: '12-17',
    reversal: 'Idarucizumab (Praxbind)',
  },
  // Vitamin K antagonist (comparator)
  {
    genericName: 'warfarin',
    brandNames: ['Coumadin', 'Jantoven'],
    rxnormCode: '11289',
    atcCode: 'B01AA03',
    standardDoses: ['Individualized (target INR 2.0-3.0)'],
    renalThresholds: { block: -1, doseReduce: null }, // No renal-based block
    metabolismPathway: 'CYP2C9/CYP3A4/VKORC1',
    halfLifeHours: '20-60',
    reversal: 'Vitamin K (Phytonadione) + FFP/PCC',
  },
];

async function seedMedicationConcepts() {
  console.log('\n--- Seeding Medication Concepts (DOAC Registry) ---');

  // Store as feature flags for the medication registry
  for (const med of DOAC_REGISTRY) {
    await prisma.featureFlag.upsert({
      where: {
        name_clinicId: {
          name: `med.registry.${med.genericName}`,
          clinicId: GLOBAL_CLINIC_ID,
        },
      },
      update: {
        description: JSON.stringify(med),
        enabled: true,
      },
      create: {
        name: `med.registry.${med.genericName}`,
        description: JSON.stringify(med),
        enabled: true,
        clinicId: GLOBAL_CLINIC_ID,
        reason: 'Master data seed — DOAC medication registry',
      },
    });
  }

  console.log(`  ${DOAC_REGISTRY.length} medication concepts seeded`);
  return DOAC_REGISTRY.length;
}

// ---------------------------------------------------------------------------
// 5. FEATURE FLAGS (Production Defaults)
// ---------------------------------------------------------------------------

const PRODUCTION_FLAGS = [
  // Safety engine
  { name: 'cds.doac.safety.enabled', enabled: true, reason: 'DOAC safety engine — core product' },
  { name: 'cds.drug.interactions.enabled', enabled: true, reason: 'Drug interaction checking' },
  { name: 'cds.contraindications.enabled', enabled: true, reason: 'Medication contraindication alerts' },
  { name: 'cds.stale.data.check.enabled', enabled: true, reason: 'Stale lab data attestation requirement' },
  { name: 'cds.beers.criteria.enabled', enabled: true, reason: 'AGS Beers Criteria for geriatric patients' },

  // Governance
  { name: 'governance.audit.trail.enabled', enabled: true, reason: 'Immutable audit trail — regulatory requirement' },
  { name: 'governance.override.logging.enabled', enabled: true, reason: 'Override event capture for RLHF pipeline' },
  { name: 'governance.consent.whatsapp.enabled', enabled: true, reason: 'WhatsApp consent management' },

  // RLHF pipeline
  { name: 'rlhf.assurance.capture.enabled', enabled: false, reason: 'RLHF data capture — enable after privacy review' },
  { name: 'rlhf.anonymizer.pipeline.enabled', enabled: false, reason: 'Air-gap anonymizer — pending Ruth sign-off' },
  { name: 'rlhf.whatsapp.survey.enabled', enabled: false, reason: 'T+48h micro-survey — pending IRB approval' },

  // Billing
  { name: 'billing.auto.code.assignment.enabled', enabled: true, reason: 'Automatic TUSS code assignment from severity' },
  { name: 'billing.duplicate.prevention.enabled', enabled: true, reason: 'Anti-fraud: one event = one bill' },
  { name: 'billing.currency.default', enabled: true, reason: 'BOB (Boliviano) — default for Bolivia pilot' },

  // Infrastructure
  { name: 'infra.latency.threshold.ms', enabled: true, reason: 'Alert if response > 3500ms (Starlink SLA)' },
  { name: 'infra.uptime.sla.percent', enabled: true, reason: '99.5% uptime target' },
];

async function seedFeatureFlags() {
  console.log('\n--- Seeding Feature Flags (Production Defaults) ---');

  for (const flag of PRODUCTION_FLAGS) {
    await prisma.featureFlag.upsert({
      where: {
        name_clinicId: {
          name: flag.name,
          clinicId: GLOBAL_CLINIC_ID,
        },
      },
      update: {
        enabled: flag.enabled,
        reason: flag.reason,
      },
      create: {
        name: flag.name,
        enabled: flag.enabled,
        reason: flag.reason,
        clinicId: GLOBAL_CLINIC_ID,
      },
    });
  }

  console.log(`  ${PRODUCTION_FLAGS.length} feature flags seeded`);
  return PRODUCTION_FLAGS.length;
}

// ---------------------------------------------------------------------------
// 6. APPOINTMENT TYPE CONFIGS
// ---------------------------------------------------------------------------

const APPOINTMENT_TYPES = [
  {
    name: 'DOAC Safety Review',
    code: 'DOAC_SAFETY_REVIEW',
    appointmentType: 'IN_PERSON' as const,
    defaultDuration: 30,
    bufferAfter: 10,
    color: '#ef4444',
    description: 'Clinical review triggered by BLOCK or FLAG decision. Requires physician + pharmacist.',
    basePrice: 4500,
    currency: 'BOB',
  },
  {
    name: 'Standard DOAC Verification',
    code: 'DOAC_VERIFICATION',
    appointmentType: 'IN_PERSON' as const,
    defaultDuration: 15,
    bufferAfter: 5,
    color: '#22c55e',
    description: 'Routine DOAC dosing verification for PASS cases.',
    basePrice: 1250,
    currency: 'BOB',
  },
  {
    name: 'Renal Function Recheck',
    code: 'RENAL_RECHECK',
    appointmentType: 'TELEHEALTH' as const,
    defaultDuration: 20,
    bufferAfter: 5,
    color: '#f59e0b',
    description: 'Follow-up for ATTESTATION_REQUIRED cases with stale or missing renal data.',
    basePrice: 3000,
    currency: 'BOB',
  },
  {
    name: 'New Patient Intake',
    code: 'NEW_PATIENT_INTAKE',
    appointmentType: 'IN_PERSON' as const,
    defaultDuration: 45,
    bufferAfter: 15,
    color: '#3b82f6',
    description: 'Initial patient onboarding with full lab panel and medication reconciliation.',
    basePrice: 3750,
    currency: 'BOB',
  },
];

async function seedAppointmentTypes() {
  console.log('\n--- Seeding Appointment Type Configs ---');

  let count = 0;
  for (const apt of APPOINTMENT_TYPES) {
    try {
      // Use find + create/update instead of upsert because the unique
      // index on `code` may not exist in the DB (schema drift).
      const existing = await prisma.appointmentTypeConfig.findFirst({
        where: { code: apt.code },
      });

      if (existing) {
        await prisma.appointmentTypeConfig.update({
          where: { id: existing.id },
          data: {
            name: apt.name,
            defaultDuration: apt.defaultDuration,
            bufferAfter: apt.bufferAfter,
            color: apt.color,
            description: apt.description,
            basePrice: apt.basePrice,
            currency: apt.currency,
            isActive: true,
          },
        });
      } else {
        await prisma.appointmentTypeConfig.create({
          data: {
            name: apt.name,
            code: apt.code,
            appointmentType: apt.appointmentType,
            defaultDuration: apt.defaultDuration,
            bufferAfter: apt.bufferAfter,
            color: apt.color,
            description: apt.description,
            basePrice: apt.basePrice,
            currency: apt.currency,
            allowOnline: false,
            requireConfirmation: true,
            isActive: true,
          },
        });
      }
      count++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('does not exist') || msg.includes('relation')) {
        console.warn('  SKIP: AppointmentTypeConfig table not available');
        return 0;
      }
      throw e;
    }
  }

  console.log(`  ${count} appointment types seeded`);
  return count;
}

// ---------------------------------------------------------------------------
// 7. TREATMENT PROTOCOLS
// ---------------------------------------------------------------------------

async function seedTreatmentProtocols() {
  console.log('\n--- Seeding Treatment Protocols ---');

  const protocols = [
    {
      conditionIcd10: 'I48.91',
      conditionName: 'Atrial Fibrillation — DOAC Anticoagulation',
      version: '1.0.0',
      guidelineSource: 'ESC 2024 / AHA/ACC/HRS 2023',
      guidelineUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
      eligibility: JSON.stringify([
        { field: 'diagnosis', operator: 'includes', value: 'I48', required: true },
        { field: 'age', operator: '>=', value: 18, required: true },
        { field: 'CHA2DS2-VASc', operator: '>=', value: 1, required: false },
      ]),
      recommendations: JSON.stringify([
        {
          step: 1,
          action: 'Calculate CHA2DS2-VASc score',
          detail: 'Score >= 2 (men) or >= 3 (women): recommend OAC',
        },
        {
          step: 2,
          action: 'Assess renal function (CrCl via Cockcroft-Gault)',
          detail: 'Determines DOAC eligibility and dose adjustment',
        },
        {
          step: 3,
          action: 'Select DOAC based on patient profile',
          detail: 'Apixaban preferred in elderly/renal impairment. Rivaroxaban for once-daily dosing preference.',
        },
        {
          step: 4,
          action: 'Monitor: renal function q3-6mo, Hgb annually, hepatic function annually',
          detail: 'Per EHRA practical guide',
        },
      ]),
      isActive: true,
    },
    {
      conditionIcd10: 'I82.40',
      conditionName: 'Deep Vein Thrombosis — Acute Treatment',
      version: '1.0.0',
      guidelineSource: 'CHEST 2024 / ACCP',
      guidelineUrl: 'https://journal.chestnet.org/',
      eligibility: JSON.stringify([
        { field: 'diagnosis', operator: 'includes', value: 'I82', required: true },
        { field: 'age', operator: '>=', value: 18, required: true },
      ]),
      recommendations: JSON.stringify([
        {
          step: 1,
          action: 'Initiate anticoagulation (DOAC preferred over warfarin)',
          detail: 'Rivaroxaban 15mg BID x21d then 20mg QD, or Apixaban 10mg BID x7d then 5mg BID',
        },
        {
          step: 2,
          action: 'Duration: minimum 3 months; assess for extended therapy',
          detail: 'Unprovoked DVT may warrant indefinite anticoagulation',
        },
      ]),
      isActive: true,
    },
  ];

  let count = 0;
  for (const protocol of protocols) {
    try {
      await prisma.treatmentProtocol.upsert({
        where: {
          conditionIcd10_version: {
            conditionIcd10: protocol.conditionIcd10,
            version: protocol.version,
          },
        },
        update: {
          conditionName: protocol.conditionName,
          guidelineSource: protocol.guidelineSource,
          guidelineUrl: protocol.guidelineUrl,
          eligibility: protocol.eligibility,
          recommendations: protocol.recommendations,
          isActive: protocol.isActive,
        },
        create: protocol,
      });
      count++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('does not exist') || msg.includes('relation')) {
        console.warn('  SKIP: TreatmentProtocol table not available');
        return 0;
      }
      throw e;
    }
  }

  console.log(`  ${count} treatment protocols seeded`);
  return count;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  SEED MASTER DATA — "The Brain"');
  console.log('  Zero patients. Pure clinical intelligence.');
  console.log('='.repeat(60));

  const results = {
    clinicalRules: 0,
    billingCodes: 0,
    icd10Codes: 0,
    medicationConcepts: 0,
    featureFlags: 0,
    appointmentTypes: 0,
    treatmentProtocols: 0,
  };

  try {
    results.clinicalRules = await seedClinicalRules();
    results.billingCodes = await seedBillingCodes();
    results.icd10Codes = await seedICD10Codes();
    results.medicationConcepts = await seedMedicationConcepts();
    results.featureFlags = await seedFeatureFlags();
    results.appointmentTypes = await seedAppointmentTypes();
    results.treatmentProtocols = await seedTreatmentProtocols();

    console.log('\n' + '='.repeat(60));
    console.log('  MASTER DATA SEED COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Clinical Rules:       ${results.clinicalRules}`);
    console.log(`  Billing Codes:        ${results.billingCodes}`);
    console.log(`  ICD-10 Codes:         ${results.icd10Codes}`);
    console.log(`  Medication Concepts:  ${results.medicationConcepts}`);
    console.log(`  Feature Flags:        ${results.featureFlags}`);
    console.log(`  Appointment Types:    ${results.appointmentTypes}`);
    console.log(`  Treatment Protocols:  ${results.treatmentProtocols}`);
    console.log('');
    console.log('  Database is BRAIN-READY. Zero patients. Zero transactions.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nSEED FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
