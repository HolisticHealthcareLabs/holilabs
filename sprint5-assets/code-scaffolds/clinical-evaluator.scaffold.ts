/**
 * Clinical Evaluator — Real-time clinical decision support rule engine
 *
 * Reference for src/app/api/clinical/evaluate/route.ts
 *
 * Evaluates clinical-decision-rules.json against patient context.
 * Returns alerts sorted by severity, risk scores, and screenings due.
 *
 * ELENA: every alert includes sourceAuthority, citationUrl, evidenceGrade, humanReviewRequired: true
 * ELENA: missing data → INSUFFICIENT_DATA, never imputed
 * CYRUS: createProtectedRoute(CLINICIAN), X-Access-Reason required
 *
 * @see sprint5-assets/clinical-decision-rules.json — 19 rules
 * @see sprint5-assets/code-scaffolds/rule-engine-scoring.scaffold.ts — scoring functions
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import from your paths
// import { getServerSession } from 'next-auth/next';
// import { prisma } from '@/lib/prisma';
// import { emitClinicalAlert } from '@/lib/events/emit';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClinicalAlert {
  id: string;
  ruleId: string;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe' | 'critical';
  summary: string;
  recommendation: Record<string, string>; // Trilingual
  urgency: 'routine' | 'urgent' | 'emergent';
  sourceAuthority: string;
  citationUrl: string;
  evidenceGrade: string;
  humanReviewRequired: true; // ELENA: always true
  triggeredBy: string; // What data triggered this (e.g., "systolicBP: 185")
  contraindications?: string[];
}

export interface RiskScore {
  instrumentId: string;
  score: number;
  severity: string;
  severityColor: string;
  lastAssessed: string | null;
  interpretation: Record<string, string>;
}

export interface ScreeningDue {
  screeningType: string;
  lastDate: string | null;
  nextDue: string;
  guideline: string;
  priority: 'routine' | 'overdue' | 'urgent';
}

interface PatientContext {
  id: string;
  age: number;
  sex: 'M' | 'F';
  vitals?: { systolicBP?: number; diastolicBP?: number; heartRate?: number; bmi?: number; temperature?: number };
  labs?: { hba1c?: number; ldl?: number; egfr?: number; potassium?: number; tsh?: number; hemoglobin?: number };
  medications: string[];
  allergies: string[];
  activeConditions: string[]; // ICD-10 codes
  screeningHistory: Array<{ instrumentId: string; score: number; date: string; responses?: Record<string, number> }>;
}

// ─── Severity Order ──────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  critical: 5, severe: 4, moderate: 3, mild: 2, minimal: 1,
};

// ─── Rule Evaluation ─────────────────────────────────────────────────────────

function evaluateLabRule(
  ruleId: string,
  field: string,
  value: number | undefined,
  threshold: { gte?: number; lt?: number; lte?: number },
  rule: { name: Record<string, string>; recommendation: Record<string, string>; urgency: string; evidenceLevel: string; sourceAuthority: string; citationUrl: string; contraindications?: string[] }
): ClinicalAlert | null {
  if (value === undefined || value === null) return null; // ELENA: missing → skip, don't impute

  let triggered = false;
  if (threshold.gte !== undefined && value >= threshold.gte) triggered = true;
  if (threshold.lt !== undefined && value < threshold.lt) triggered = true;
  if (threshold.lte !== undefined && value <= threshold.lte) triggered = true;

  if (!triggered) return null;

  return {
    id: `alert_${ruleId}_${Date.now()}`,
    ruleId,
    severity: rule.urgency === 'emergent' ? 'critical' : rule.urgency === 'urgent' ? 'severe' : 'moderate',
    summary: rule.name['en'] || rule.name['pt-BR'],
    recommendation: rule.recommendation,
    urgency: rule.urgency as ClinicalAlert['urgency'],
    sourceAuthority: rule.sourceAuthority,
    citationUrl: rule.citationUrl,
    evidenceGrade: rule.evidenceLevel,
    humanReviewRequired: true, // ELENA invariant
    triggeredBy: `${field}: ${value}`,
    contraindications: rule.contraindications,
  };
}

function evaluateDrugInteraction(medications: string[]): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const meds = medications.map((m) => m.toLowerCase());

  // Rule DRUG-001: ACEi/ARB + Spironolactone → hyperkalemia risk
  const hasACEiARB = meds.some((m) => /enalapril|lisinopril|losartan|valsartan|captopril|ramipril/i.test(m));
  const hasSpironolactone = meds.some((m) => /spironolactone|espironolactona/i.test(m));

  if (hasACEiARB && hasSpironolactone) {
    alerts.push({
      id: `alert_DRUG-001_${Date.now()}`,
      ruleId: 'DRUG-001',
      severity: 'severe',
      summary: 'ACEi/ARB + Spironolactone: high hyperkalemia risk',
      recommendation: {
        en: 'Check serum K+ within 1 week of initiation, then monthly for 3 months. Hold if K+ >5.5 mEq/L.',
        'pt-BR': 'Verificar K+ sérico em 1 semana do início, depois mensalmente por 3 meses. Suspender se K+ >5,5 mEq/L.',
        es: 'Verificar K+ sérico en 1 semana del inicio, luego mensualmente por 3 meses. Suspender si K+ >5,5 mEq/L.',
      },
      urgency: 'urgent',
      sourceAuthority: 'ACC/AHA Heart Failure Guidelines',
      citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/35363500/',
      evidenceGrade: 'A',
      humanReviewRequired: true,
      triggeredBy: `Medications: ${medications.filter((m) => /enalapril|lisinopril|losartan|valsartan|spironolactone|espironolactona/i.test(m)).join(', ')}`,
    });
  }

  return alerts;
}

function evaluateScreeningGaps(
  patient: PatientContext,
  screeningHistory: PatientContext['screeningHistory']
): ScreeningDue[] {
  const due: ScreeningDue[] = [];
  const now = new Date();

  // Mammography: women 50-69, every 24 months
  if (patient.sex === 'F' && patient.age >= 50 && patient.age <= 69) {
    const lastMammogram = screeningHistory.find((s) => s.instrumentId === 'mammogram');
    const lastDate = lastMammogram?.date ? new Date(lastMammogram.date) : null;
    const monthsSince = lastDate ? (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30) : 999;
    if (monthsSince >= 24) {
      due.push({
        screeningType: 'MAMMOGRAM',
        lastDate: lastDate?.toISOString() || null,
        nextDue: 'NOW',
        guideline: 'INCA — Mamografia bienal para mulheres de 50-69 anos',
        priority: monthsSince >= 30 ? 'urgent' : 'overdue',
      });
    }
  }

  // PHQ-9: if previous score ≥10, rescreen every 3 months
  const lastPHQ9 = screeningHistory.filter((s) => s.instrumentId === 'phq9').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (lastPHQ9 && lastPHQ9.score >= 10) {
    const monthsSince = (now.getTime() - new Date(lastPHQ9.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSince >= 3) {
      due.push({
        screeningType: 'PHQ-9',
        lastDate: lastPHQ9.date,
        nextDue: 'NOW',
        guideline: 'APA — Rescreen PHQ-9 every 3 months if score ≥10',
        priority: 'overdue',
      });
    }
  }

  return due;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // CYRUS: auth check
  // TODO: holilabsv2 — createProtectedRoute(CLINICIAN), X-Access-Reason: TREATMENT

  const body = await request.json();
  const { patientId, encounterContext } = body as { patientId: string; encounterContext?: Partial<PatientContext['vitals'] & PatientContext['labs']> };

  // ── Load patient context from Prisma ───────────────────────────────────
  // TODO: holilabsv2 — aggregate patient data from multiple models
  // const patient = await prisma.patient.findUnique({ where: { id: patientId }, include: { medications: true, allergies: true, ... } });

  // Scaffold placeholder — replace with real Prisma queries
  const patient: PatientContext = {
    id: patientId,
    age: 67,
    sex: 'M',
    vitals: encounterContext as PatientContext['vitals'],
    labs: encounterContext as PatientContext['labs'],
    medications: [],
    allergies: [],
    activeConditions: [],
    screeningHistory: [],
  };

  // ── Evaluate rules ─────────────────────────────────────────────────────
  const alerts: ClinicalAlert[] = [];

  // Hypertension rules
  if (patient.vitals?.systolicBP) {
    const htnCrisis = evaluateLabRule('HTN-002', 'systolicBP', patient.vitals.systolicBP, { gte: 180 }, {
      name: { en: 'Hypertensive Crisis', 'pt-BR': 'Crise Hipertensiva', es: 'Crisis Hipertensiva' },
      recommendation: { en: 'Assess for target organ damage. If present → emergency referral.', 'pt-BR': 'Avaliar lesão de órgão-alvo. Se presente → encaminhar emergência.', es: 'Evaluar daño de órgano blanco. Si presente → referir emergencia.' },
      urgency: 'emergent', evidenceLevel: 'A', sourceAuthority: 'ACC/AHA 2017', citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/29133356/',
    });
    if (htnCrisis) alerts.push(htnCrisis);

    const htnStage2 = evaluateLabRule('HTN-001', 'systolicBP', patient.vitals.systolicBP, { gte: 160 }, {
      name: { en: 'Hypertension Stage 2', 'pt-BR': 'Hipertensão Estágio 2', es: 'Hipertensión Estadio 2' },
      recommendation: { en: 'Initiate combination therapy. Recheck in 1 month.', 'pt-BR': 'Iniciar terapia combinada. Reavaliar em 1 mês.', es: 'Iniciar terapia combinada. Reevaluar en 1 mes.' },
      urgency: 'urgent', evidenceLevel: 'A', sourceAuthority: 'JNC 8 / SBC', citationUrl: 'https://pubmed.ncbi.nlm.nih.gov/24352797/',
    });
    if (htnStage2 && !htnCrisis) alerts.push(htnStage2); // Don't double-alert
  }

  // Diabetes rules
  if (patient.labs?.hba1c) {
    const hba1cHigh = evaluateLabRule('DM-002', 'hba1c', patient.labs.hba1c, { gte: 8.0 }, {
      name: { en: 'HbA1c Above Target', 'pt-BR': 'HbA1c Acima da Meta', es: 'HbA1c Por Encima de Meta' },
      recommendation: { en: 'Review adherence, consider adding second agent.', 'pt-BR': 'Revisar adesão, considerar segundo agente.', es: 'Revisar adherencia, considerar segundo agente.' },
      urgency: 'urgent', evidenceLevel: 'A', sourceAuthority: 'ADA 2024', citationUrl: 'https://diabetesjournals.org/care/article/47/Supplement_1/S158/153955/',
    });
    if (hba1cHigh) alerts.push(hba1cHigh);
  }

  // CKD rules
  if (patient.labs?.egfr) {
    const ckd5 = evaluateLabRule('CKD-002', 'egfr', patient.labs.egfr, { lt: 15 }, {
      name: { en: 'eGFR <15 — Kidney Failure', 'pt-BR': 'TFGe <15 — Falência Renal', es: 'TFGe <15 — Falla Renal' },
      recommendation: { en: 'URGENT nephrology referral. Prepare for renal replacement therapy.', 'pt-BR': 'Encaminhamento URGENTE para nefrologia.', es: 'Referencia URGENTE a nefrología.' },
      urgency: 'emergent', evidenceLevel: 'A', sourceAuthority: 'KDIGO 2024', citationUrl: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
    });
    if (ckd5) alerts.push(ckd5);
  }

  // Drug interactions
  const drugAlerts = evaluateDrugInteraction(patient.medications);
  alerts.push(...drugAlerts);

  // Screening gaps
  const screeningsDue = evaluateScreeningGaps(patient, patient.screeningHistory);

  // ── Sort alerts by severity (critical first) ───────────────────────────
  alerts.sort((a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0));

  // ── Emit SSE for moderate+ alerts ──────────────────────────────────────
  for (const alert of alerts) {
    if (SEVERITY_ORDER[alert.severity] >= 3) { // moderate or higher
      // TODO: holilabsv2 — emitClinicalAlert(patient.organizationId, { ... });
    }
  }

  // ── Build risk scores from screening history ───────────────────────────
  const riskScores: RiskScore[] = patient.screeningHistory.map((s) => ({
    instrumentId: s.instrumentId,
    score: s.score,
    severity: 'unknown', // TODO: holilabsv2 — compute from scoring engine
    severityColor: 'clinical-routine',
    lastAssessed: s.date,
    interpretation: { en: '', 'pt-BR': '', es: '' },
  }));

  return NextResponse.json({
    alerts,
    riskScores,
    screeningsDue,
    evaluatedAt: new Date().toISOString(),
    rulesEvaluated: alerts.length > 0 ? alerts.map((a) => a.ruleId) : [],
  });
}
