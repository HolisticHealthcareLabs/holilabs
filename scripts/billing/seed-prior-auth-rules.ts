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
  insurerLookup: { field: 'ansCode' | 'rnos' | 'cnsCode' | 'naicCode' | 'rutCode' | 'rfcCode'; value: string };
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
  // ── United States (UnitedHealthcare) ──────────────────────────────
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '27447', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 14, urgentWindowHours: 72,
    requiredDocuments: ['REFERRAL_LETTER', 'IMAGING_REPORT', 'CLINICAL_REPORT', 'CONSERVATIVE_TREATMENT_LOG'],
    requiredDiagnoses: ['M17.0', 'M17.1', 'M17.9'],
    notes: 'Total knee arthroplasty — requires 6-month conservative treatment documentation',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '33533', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 10, urgentWindowHours: 24,
    requiredDocuments: ['CARDIAC_CATHETERIZATION', 'CLINICAL_REPORT', 'ECG', 'STRESS_TEST'],
    requiredDiagnoses: ['I25.1', 'I25.10', 'I25.5'],
    notes: 'CABG — requires cardiac catheterization and cardiologist opinion',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '73721', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 5,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: [],
    notes: 'MRI knee — requires physician referral',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '55700', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 7, urgentWindowHours: 48,
    requiredDocuments: ['BIOPSY_REPORT', 'PSA_RESULT', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['C61'],
    notes: 'Prostate biopsy — requires elevated PSA or abnormal DRE',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '90837', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 3,
    requiredDocuments: ['PSYCHIATRIC_REPORT', 'TREATMENT_PLAN'],
    requiredDiagnoses: ['F20', 'F31', 'F32', 'F33'],
    notes: 'Extended psychiatric session — requires treatment plan on file',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '45378', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 5,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: [],
    notes: 'Diagnostic colonoscopy — requires referral if under 45',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '62322', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 5,
    requiredDocuments: ['IMAGING_REPORT', 'CLINICAL_REPORT', 'CONSERVATIVE_TREATMENT_LOG'],
    requiredDiagnoses: ['M54.5', 'M54.4'],
    notes: 'Lumbar epidural injection — requires imaging and conservative treatment failure',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '79413' },
    procedureCode: '43644', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 30, urgentWindowHours: 72,
    requiredDocuments: ['CLINICAL_REPORT', 'NUTRITIONAL_ASSESSMENT', 'PSYCHOLOGICAL_EVALUATION', 'SLEEP_STUDY'],
    requiredDiagnoses: ['E66.01', 'E66.09'],
    notes: 'Bariatric surgery — requires multidisciplinary evaluation over 6 months',
    effectiveDate: '2024-01-01',
  },
  // ── Canada (OHIP) ─────────────────────────────────────────────────
  {
    insurerLookup: { field: 'naicCode', value: '91617' },
    procedureCode: '73721', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 14,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: [],
    notes: 'MRI — requires specialist referral per OHIP guidelines',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '91617' },
    procedureCode: '27447', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 21, urgentWindowHours: 72,
    requiredDocuments: ['REFERRAL_LETTER', 'IMAGING_REPORT', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['M17.0', 'M17.1'],
    notes: 'Joint replacement — wait list management and prior approval required',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '91617' },
    procedureCode: '93510', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 14, urgentWindowHours: 48,
    requiredDocuments: ['CARDIAC_CATHETERIZATION', 'ECG', 'STRESS_TEST'],
    requiredDiagnoses: ['I25.1', 'I20.0'],
    notes: 'Cardiac catheterization — requires non-invasive testing first',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'naicCode', value: '91617' },
    procedureCode: '90837', procedureSystem: BillingSystem.CPT,
    required: true, windowDays: 5,
    requiredDocuments: ['PSYCHIATRIC_REPORT'],
    requiredDiagnoses: ['F20', 'F31', 'F32', 'F33'],
    notes: 'Extended psychiatric — requires psychiatrist referral',
    effectiveDate: '2024-01-01',
  },
  // ── Colombia (Sura) ───────────────────────────────────────────────
  {
    insurerLookup: { field: 'rutCode', value: '800088702-2' },
    procedureCode: '811503', procedureSystem: BillingSystem.CUPS,
    required: true, windowDays: 10, urgentWindowHours: 48,
    requiredDocuments: ['REFERRAL_LETTER', 'IMAGING_REPORT', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['M17.0', 'M17.1'],
    notes: 'Artroplastia de rodilla — autorización previa con imágenes diagnósticas',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rutCode', value: '800088702-2' },
    procedureCode: '883101', procedureSystem: BillingSystem.CUPS,
    required: true, windowDays: 5,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: [],
    notes: 'Resonancia magnética cerebral — requiere orden del especialista',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rutCode', value: '800088702-2' },
    procedureCode: '331602', procedureSystem: BillingSystem.CUPS,
    required: true, windowDays: 14, urgentWindowHours: 24,
    requiredDocuments: ['CARDIAC_CATHETERIZATION', 'CLINICAL_REPORT', 'ECG'],
    requiredDiagnoses: ['I25.1', 'I25.5'],
    notes: 'Revascularización miocárdica — requiere cateterismo y junta médica',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rutCode', value: '800088702-2' },
    procedureCode: '890210', procedureSystem: BillingSystem.CUPS,
    required: true, windowDays: 7,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['I10', 'I11.9', 'I25.1'],
    notes: 'Consulta cardiología — requiere referencia de medicina general',
    effectiveDate: '2024-01-01',
  },
  // ── Mexico (IMSS) ─────────────────────────────────────────────────
  {
    insurerLookup: { field: 'rfcCode', value: 'IMS421231I45' },
    procedureCode: '81.54', procedureSystem: BillingSystem.CIE9_MC_MX,
    required: true, windowDays: 14, urgentWindowHours: 72,
    requiredDocuments: ['REFERRAL_LETTER', 'IMAGING_REPORT', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['M17.0', 'M17.1'],
    notes: 'Reemplazo total de rodilla — requiere autorización del Comité de Cirugía',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rfcCode', value: 'IMS421231I45' },
    procedureCode: '88.91', procedureSystem: BillingSystem.CIE9_MC_MX,
    required: true, windowDays: 7,
    requiredDocuments: ['REFERRAL_LETTER', 'CLINICAL_REPORT'],
    requiredDiagnoses: [],
    notes: 'Resonancia magnética cerebral — requiere referencia de especialista',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rfcCode', value: 'IMS421231I45' },
    procedureCode: '36.1', procedureSystem: BillingSystem.CIE9_MC_MX,
    required: true, windowDays: 10, urgentWindowHours: 24,
    requiredDocuments: ['CARDIAC_CATHETERIZATION', 'ECG', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['I25.1', 'I25.5'],
    notes: 'Revascularización coronaria — requiere cateterismo y evaluación cardiológica',
    effectiveDate: '2024-01-01',
  },
  {
    insurerLookup: { field: 'rfcCode', value: 'IMS421231I45' },
    procedureCode: '99.25', procedureSystem: BillingSystem.CIE9_MC_MX,
    required: true, windowDays: 7,
    requiredDocuments: ['ONCOLOGY_REPORT', 'BIOPSY_REPORT', 'CLINICAL_REPORT'],
    requiredDiagnoses: ['C50', 'C34', 'C18'],
    notes: 'Quimioterapia — requiere protocolo oncológico aprobado',
    effectiveDate: '2024-01-01',
  },
];

export async function seedPriorAuthRules(): Promise<number> {
  let count = 0;

  for (const rule of RULES) {
    // Lookup insurer
    let insurer = null;
    const { field, value } = rule.insurerLookup;
    if (field === 'ansCode') {
      insurer = await prisma.insurer.findUnique({ where: { ansCode: value } });
    } else if (field === 'rnos') {
      insurer = await prisma.insurer.findUnique({ where: { rnos: value } });
    } else if (field === 'cnsCode') {
      insurer = await prisma.insurer.findUnique({ where: { cnsCode: value } });
    } else if (field === 'naicCode') {
      insurer = await prisma.insurer.findUnique({ where: { naicCode: value } });
    } else if (field === 'rutCode') {
      insurer = await prisma.insurer.findUnique({ where: { rutCode: value } });
    } else if (field === 'rfcCode') {
      insurer = await prisma.insurer.findUnique({ where: { rfcCode: value } });
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
