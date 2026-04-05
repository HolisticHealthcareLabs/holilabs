/**
 * Co-Pilot Context — Patient context aggregation for Clinical Command
 *
 * Reference for src/app/api/copilot/context/[encounterId]/route.ts
 *
 * Aggregates: demographics, medications, allergies, recent labs, active problems,
 * recent encounters, clinical alerts, screening scores.
 *
 * CYRUS: verifyPatientAccess, PHI logged, X-Access-Reason required
 *
 * @see sprint5-assets/api-contracts.json — copilot.GET /api/copilot/context/:encounterId
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import from your paths
// import { getServerSession } from 'next-auth/next';
// import { prisma } from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientDemographics {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  sex: string;
  mrn?: string;
  phone?: string;
  dateOfBirth: string;
}

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  prescribedBy?: string;
}

interface Allergy {
  id: string;
  substance: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  verificationStatus: 'confirmed' | 'unconfirmed';
}

interface LabResult {
  id: string;
  testName: string;
  loincCode?: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  collectedAt: string;
}

interface ActiveProblem {
  id: string;
  icd10Code: string;
  description: string;
  onsetDate?: string;
  status: 'active' | 'resolved' | 'recurrence';
}

interface RecentEncounter {
  id: string;
  date: string;
  type: string;
  reasonCode: string;
  status: string;
  clinicianName: string;
  soapSummary?: string; // First 200 chars of assessment
}

interface ClinicalAlert {
  id: string;
  ruleId: string;
  severity: string;
  summary: string;
  sourceAuthority: string;
}

interface ScreeningScore {
  instrumentId: string;
  score: number;
  severity: string;
  completedAt: string;
}

export interface CopilotContext {
  patient: PatientDemographics;
  encounter: { id: string; status: string; startTime: string; reasonCode: string };
  medications: Medication[];
  allergies: Allergy[];
  recentLabs: LabResult[];
  activeProblems: ActiveProblem[];
  recentEncounters: RecentEncounter[];
  alerts: ClinicalAlert[];
  screeningScores: ScreeningScore[];
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { encounterId: string };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { encounterId } = context.params;

  // ── CYRUS: Auth + PHI ──────────────────────────────────────────────────
  // TODO: holilabsv2 — createProtectedRoute(CLINICIAN)
  // const session = await getServerSession(authOptions);
  // if (!session?.user || session.user.role !== 'CLINICIAN') {
  //   return NextResponse.json({ error: 'E-3002' }, { status: 403 });
  // }

  const phiReason = request.headers.get('x-access-reason');
  if (!phiReason) {
    return NextResponse.json({ error: 'E-3004', message: 'X-Access-Reason header required' }, { status: 403 });
  }

  // ── Load encounter ─────────────────────────────────────────────────────
  // TODO: holilabsv2 — const encounter = await prisma.encounter.findUnique({ where: { id: encounterId }, include: { patient: true } });
  // if (!encounter) return NextResponse.json({ error: 'E-4006' }, { status: 404 });

  // CYRUS: Verify patient access (tenant isolation)
  // TODO: holilabsv2 — if (encounter.organizationId !== session.user.organizationId) return NextResponse.json({ error: 'E-3003' }, { status: 404 });

  // Scaffold placeholder — replace with real Prisma queries
  const patientId = 'pat_01'; // TODO: from encounter.patientId

  // ── Aggregate context from multiple models ─────────────────────────────

  // TODO: holilabsv2 — run these queries in parallel with Promise.all
  // const [patient, medications, allergies, recentLabs, activeProblems, recentEncounters, alerts, screeningScores] = await Promise.all([
  //   prisma.patient.findUnique({ where: { id: patientId } }),
  //   prisma.medication.findMany({ where: { patientId, status: 'ACTIVE' }, orderBy: { startDate: 'desc' }, take: 20 }),
  //   prisma.allergy.findMany({ where: { patientId } }),
  //   prisma.labResult.findMany({ where: { patientId }, orderBy: { collectedAt: 'desc' }, take: 5 }),
  //   prisma.condition.findMany({ where: { patientId, status: 'active' } }),
  //   prisma.encounter.findMany({ where: { patientId, id: { not: encounterId } }, orderBy: { startTime: 'desc' }, take: 3 }),
  //   // Clinical alerts evaluated on-the-fly
  //   fetch(`/api/clinical/evaluate`, { method: 'POST', body: JSON.stringify({ patientId }) }).then(r => r.json()),
  //   prisma.screeningResult.findMany({ where: { patientId }, orderBy: { completedAt: 'desc' }, take: 10 }),
  // ]);

  // Scaffold placeholder response
  const response: CopilotContext = {
    patient: { id: patientId, firstName: 'João Carlos', lastName: 'da Silva', age: 67, sex: 'M', dateOfBirth: '1959-04-15' },
    encounter: { id: encounterId, status: 'IN_PROGRESS', startTime: new Date().toISOString(), reasonCode: 'I10' },
    medications: [],
    allergies: [],
    recentLabs: [],
    activeProblems: [],
    recentEncounters: [],
    alerts: [],
    screeningScores: [],
  };

  // ── CYRUS: Audit PHI access ────────────────────────────────────────────
  // TODO: holilabsv2 — prisma.auditLog.create({
  //   data: { actionType: 'PHI_ACCESS', userId: session.user.id,
  //     entityType: 'CopilotContext', entityId: encounterId,
  //     accessReason: phiReason }
  // });

  return NextResponse.json(response);
}
