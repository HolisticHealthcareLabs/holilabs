/**
 * Billing Intelligence — Prior Authorization Rule Seeder
 *
 * Seeds PriorAuthRule rows for procedures that require pre-authorization.
 * Rules are derived from published insurer guidelines and common market practice.
 *
 * MUST run AFTER seed-procedure-codes and seed-insurers.
 * Uses upsert with (insurerId, procedureCodeId, effectiveDate) unique key.
 */

import { PrismaClient, BillingSystem } from '@prisma/client';

const prisma = new PrismaClient();

interface PriorAuthRuleSpec {
  insurerLookup: { field: 'ansCode' | 'rnos' | 'cnsCode'; value: string };
  procedureCode: string;
  procedureSystem: BillingSystem;
  required: boolean;
  windowDays?: number;
  urgentWindowHours?: number;
  requiredDocuments: string[];
  requiredDiagnoses: string[];
  notes?: string;
  effectiveDate: string;
}

const RULES: PriorAuthRuleSpec[] = [
  // ── Brazil (Bradesco) ────────────────────────────────────────────────
  {
    insurerLookup: { field: 'ansCode', value: '005711' },
    procedureCode: '3.01.01.14-6', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 5, urgentWindowHours: 24,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'IMAGING_REPORT'],
    requiredDiagnoses: ['M17.1', 'M17.9'],
    notes: 'Artroplastia de joelho — exige laudo radiológico e relatório do ortopedista',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'ansCode', value: '005711' },
    procedureCode: '3.01.01.15-4', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 10, urgentWindowHours: 48,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'CARDIAC_CATHETERIZATION', 'ECG'],
    requiredDiagnoses: ['I25.1', 'I25.5', 'I25.9'],
    notes: 'Revascularização — exige cateterismo e parecer de cardiologista',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'ansCode', value: '005711' },
    procedureCode: '2.03.01.12-4', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 3,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: [],
    notes: 'RM de coluna lombar — requer encaminhamento médico',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'ansCode', value: '005711' },
    procedureCode: '3.01.01.18-9', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 7, urgentWindowHours: 48,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'BIOPSY_REPORT', 'PSA_RESULT'],
    requiredDiagnoses: ['C61'],
    notes: 'Prostatectomia radical — exige biópsia e estadiamento',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'ansCode', value: '005711' },
    procedureCode: '6.01.02.10-1', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 2, urgentWindowHours: 24,
    requiredDocuments: ['PSYCHIATRIC_REPORT', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['F20', 'F30', 'F31', 'F32', 'F33'],
    notes: 'Internação psiquiátrica — requer relatório psiquiátrico e indicação clínica',
    effectiveDate: '2024-01-01',
  },
  // ── Brazil (Amil) ────────────────────────────────────────────────────
  {
    insurerLookup: { field: 'ansCode', value: '013774' },
    procedureCode: '3.01.01.14-6', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 7,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'IMAGING_REPORT'],
    requiredDiagnoses: ['M17.1', 'M17.9'],
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'ansCode', value: '013774' },
    procedureCode: '3.01.01.15-4', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 14, urgentWindowHours: 48,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'CARDIAC_CATHETERIZATION', 'ECG'],
    requiredDiagnoses: ['I25.1', 'I25.5', 'I25.9'],
    effectiveDate: '2024-01-01',
  },
  // ── Brazil (SulAmérica) ──────────────────────────────────────────────
  {
    insurerLookup: { field: 'ansCode', value: '006246' },
    procedureCode: '3.01.01.14-6', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 5,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'IMAGING_REPORT'],
    requiredDiagnoses: ['M17.1', 'M17.9'],
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'ansCode', value: '006246' },
    procedureCode: '2.03.01.12-4', procedureSystem: BillingSystem.TUSS,
    required: true, windowDays: 3,
    requiredDocuments: ['REFERRAL_LETTER'],
    requiredDiagnoses: [],
    effectiveDate: '2024-01-01',
  },
  // ── Argentina (OSDE) ─────────────────────────────────────────────────
  {
    insurerLookup: { field: 'rnos', value: '540202' },
    procedureCode: '050105', procedureSystem: BillingSystem.NOMENCLADOR,
    required: true, windowDays: 10, urgentWindowHours: 72,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'IMAGING_REPORT'],
    requiredDiagnoses: ['M17.1', 'M17.9'],
    notes: 'Artroplastia de rodilla — preautorización obligatoria',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rnos', value: '540202' },
    procedureCode: '050106', procedureSystem: BillingSystem.NOMENCLADOR,
    required: true, windowDays: 14, urgentWindowHours: 72,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'CARDIAC_CATHETERIZATION'],
    requiredDiagnoses: ['I25.1', 'I25.5'],
    notes: 'CRM — preautorización con cateterismo obligatorio',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rnos', value: '540202' },
    procedureCode: '040103', procedureSystem: BillingSystem.NOMENCLADOR,
    required: true, windowDays: 5,
    requiredDocuments: ['REFERRAL_LETTER'],
    requiredDiagnoses: [],
    notes: 'RM de columna — requiere derivación médica',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rnos', value: '540202' },
    procedureCode: '080103', procedureSystem: BillingSystem.NOMENCLADOR,
    required: true, windowDays: 3, urgentWindowHours: 24,
    requiredDocuments: ['PSYCHIATRIC_REPORT'],
    requiredDiagnoses: ['F20', 'F30', 'F31', 'F32', 'F33'],
    notes: 'Internación psiquiátrica — requiere reporte psiquiátrico',
    effectiveDate: '2024-01-01',
  },
  // ── Argentina (PAMI) ─────────────────────────────────────────────────
  {
    insurerLookup: { field: 'rnos', value: '423600' },
    procedureCode: '050105', procedureSystem: BillingSystem.NOMENCLADOR,
    required: true, windowDays: 14,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT', 'IMAGING_REPORT'],
    requiredDiagnoses: ['M17.1', 'M17.9'],
    notes: 'PAMI — preautorización con junta médica',
    effectiveDate: '2024-01-01',
  },
  // ── Bolivia (CNS) ────────────────────────────────────────────────────
  {
    insurerLookup: { field: 'cnsCode', value: 'CNS-001' },
    procedureCode: 'QUI-002', procedureSystem: BillingSystem.CNS_BO,
    required: true, windowDays: 3, urgentWindowHours: 24,
    requiredDocuments: ['CLINICAL_REPORT', 'ULTRASOUND_REPORT'],
    requiredDiagnoses: ['K80', 'K81'],
    notes: 'Colecistectomía CNS — reporte de ecografía requerido',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'cnsCode', value: 'CNS-001' },
    procedureCode: 'IMG-004', procedureSystem: BillingSystem.CNS_BO,
    required: true, windowDays: 3,
    requiredDocuments: ['REFERRAL_LETTER'],
    requiredDiagnoses: [],
    notes: 'TC cráneo CNS — derivación por especialista',
    effectiveDate: '2024-01-01',
  },
];

export async function seedPriorAuthRules(): Promise<number> {
  let count = 0;

  for (const rule of RULES) {
    // Lookup insurer
    let insurer = null;
    if (rule.insurerLookup.field === 'ansCode') {
      insurer = await prisma.insurer.findUnique({ where: { ansCode: rule.insurerLookup.value } });
    } else if (rule.insurerLookup.field === 'rnos') {
      insurer = await prisma.insurer.findUnique({ where: { rnos: rule.insurerLookup.value } });
    } else {
      insurer = await prisma.insurer.findUnique({ where: { cnsCode: rule.insurerLookup.value } });
    }

    if (!insurer) {
      console.warn(`  ⚠ Insurer not found: ${rule.insurerLookup.field}=${rule.insurerLookup.value}`);
      continue;
    }

    // Lookup procedure code
    const procedureCode = await prisma.procedureCode.findFirst({
      where: { code: rule.procedureCode, system: rule.procedureSystem, isActive: true },
    });

    if (!procedureCode) {
      console.warn(`  ⚠ ProcedureCode not found: ${rule.procedureCode} (${rule.procedureSystem})`);
      continue;
    }

    const effectiveDate = new Date(rule.effectiveDate);

    await prisma.priorAuthRule.upsert({
      where: {
        insurerId_procedureCodeId_effectiveDate: {
          insurerId: insurer.id,
          procedureCodeId: procedureCode.id,
          effectiveDate,
        },
      },
      update: {
        required: rule.required,
        windowDays: rule.windowDays ?? null,
        urgentWindowHours: rule.urgentWindowHours ?? null,
        requiredDocuments: rule.requiredDocuments,
        requiredDiagnoses: rule.requiredDiagnoses,
        notes: rule.notes ?? null,
      },
      create: {
        insurerId: insurer.id,
        procedureCodeId: procedureCode.id,
        required: rule.required,
        windowDays: rule.windowDays ?? null,
        urgentWindowHours: rule.urgentWindowHours ?? null,
        requiredDocuments: rule.requiredDocuments,
        requiredDiagnoses: rule.requiredDiagnoses,
        notes: rule.notes ?? null,
        effectiveDate,
      },
    });
    count++;
  }

  console.log(`  ✓ Prior auth rules — ${count} upserted`);
  return count;
}

async function main() {
  console.log('🔐 Seeding prior auth rules...');
  try {
    const count = await seedPriorAuthRules();
    console.log(`✅ Prior auth rules done — ${count} upserted`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
