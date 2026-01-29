/**
 * Prevention Hub API
 *
 * GET /api/prevention/hub/[patientId] - Fetch patient prevention profile for longitudinal hub view
 *
 * Returns:
 * - Patient demographics and calculated age
 * - Risk scores (ASCVD, Diabetes, FRAX, etc.) mapped to hub format
 * - Active interventions with status (due, overdue, scheduled)
 * - Completed interventions
 * - Prevention gaps summary
 *
 * Latency Target: ≤200ms (parallel queries, no await loops)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * Verify internal agent gateway token (HMAC-signed, 1-minute validity)
 */
function verifyInternalToken(token: string | null): boolean {
  if (!token) return false;
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  const now = Math.floor(Date.now() / 60000);
  for (const timestamp of [now, now - 1]) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`agent-internal:${timestamp}`)
      .digest('hex');
    if (token === expected) return true;
  }
  return false;
}

export const dynamic = 'force-dynamic';

// Hub-specific types
type HealthDomain =
  | 'cardiometabolic'
  | 'oncology'
  | 'musculoskeletal'
  | 'neurocognitive'
  | 'gut'
  | 'immune'
  | 'hormonal';

type InterventionStatus = 'due' | 'overdue' | 'completed' | 'scheduled' | 'declined';

type InterventionType =
  | 'screening'
  | 'lab'
  | 'lifestyle'
  | 'supplement'
  | 'diet'
  | 'exercise'
  | 'medication'
  | 'referral'
  | 'education';

interface HubRiskScore {
  id: string;
  name: string;
  score: number;
  level: 'low' | 'moderate' | 'high' | 'very-high';
  lastCalculated: Date;
  nextDue: Date;
}

interface HubIntervention {
  id: string;
  name: string;
  domain: HealthDomain;
  type: InterventionType;
  status: InterventionStatus;
  dueDate?: Date;
  completedDate?: Date;
  scheduledDate?: Date;
  description: string;
  evidence: string;
  aiRecommendation?: string;
}

// Domain mapping for screening types
const SCREENING_TO_DOMAIN: Record<string, HealthDomain> = {
  mammogram: 'oncology',
  colonoscopy: 'oncology',
  pap_smear: 'oncology',
  ldct_lung: 'oncology',
  prostate_psa: 'oncology',
  skin_check: 'oncology',
  lipid_panel: 'cardiometabolic',
  hba1c: 'cardiometabolic',
  glucose: 'cardiometabolic',
  blood_pressure: 'cardiometabolic',
  ecg: 'cardiometabolic',
  echo: 'cardiometabolic',
  dexa: 'musculoskeletal',
  bone_density: 'musculoskeletal',
  frax: 'musculoskeletal',
  cognitive_screening: 'neurocognitive',
  depression_screening: 'neurocognitive',
  anxiety_screening: 'neurocognitive',
  stool_test: 'gut',
  h_pylori: 'gut',
  flu_vaccine: 'immune',
  covid_vaccine: 'immune',
  pneumonia_vaccine: 'immune',
  shingles_vaccine: 'immune',
  thyroid: 'hormonal',
  tsh: 'hormonal',
  testosterone: 'hormonal',
  estrogen: 'hormonal',
};

// Risk type to display name mapping
const RISK_TYPE_NAMES: Record<string, string> = {
  ASCVD: '10-Year ASCVD Risk',
  DIABETES: 'Lifetime Diabetes Risk',
  FRAX: 'FRAX Score (10-year fracture)',
  LUNG_CANCER: 'Lung Cancer Risk',
  BREAST_CANCER: 'Breast Cancer Risk',
  CKD: 'CKD Progression Risk',
  STROKE: 'Stroke Risk',
};

// Map risk category to level
function mapCategoryToLevel(category: string): 'low' | 'moderate' | 'high' | 'very-high' {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes('very') || normalized.includes('critical')) return 'very-high';
  if (normalized.includes('high') || normalized.includes('elevated')) return 'high';
  if (normalized.includes('moderate') || normalized.includes('intermediate')) return 'moderate';
  return 'low';
}

// Calculate intervention status based on dates
function calculateStatus(
  dueDate: Date | null,
  completedDate: Date | null,
  scheduledDate: Date | null
): InterventionStatus {
  if (completedDate) return 'completed';
  if (scheduledDate && scheduledDate > new Date()) return 'scheduled';
  if (dueDate) {
    const now = new Date();
    if (dueDate < now) return 'overdue';
    return 'due';
  }
  return 'due';
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

// Map screening type to intervention type
function mapToInterventionType(screeningType: string): InterventionType {
  const normalized = screeningType.toLowerCase();
  if (normalized.includes('panel') || normalized.includes('test') || normalized.includes('hba1c')) {
    return 'lab';
  }
  if (normalized.includes('vaccine')) {
    return 'medication';
  }
  return 'screening';
}

// Get human-readable name for screening
function getScreeningDisplayName(screeningType: string): string {
  const names: Record<string, string> = {
    mammogram: 'Annual Mammography',
    colonoscopy: 'Colonoscopy',
    pap_smear: 'Cervical Cancer Screening (Pap)',
    ldct_lung: 'Low-Dose CT Lung Cancer Screening',
    prostate_psa: 'Prostate Cancer Screening (PSA)',
    lipid_panel: 'Advanced Lipid Panel',
    hba1c: 'HbA1c Testing',
    glucose: 'Fasting Glucose',
    blood_pressure: 'Blood Pressure Check',
    dexa: 'DEXA Bone Density Scan',
    bone_density: 'Bone Density Assessment',
    cognitive_screening: 'Cognitive Assessment',
    depression_screening: 'Depression Screening (PHQ-9)',
    flu_vaccine: 'Annual Flu Vaccination',
    covid_vaccine: 'COVID-19 Vaccination',
    thyroid: 'Thyroid Function Panel',
    tsh: 'TSH Level',
  };
  return names[screeningType] || screeningType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Get evidence text for screening
function getScreeningEvidence(screeningType: string): string {
  const evidence: Record<string, string> = {
    mammogram: 'USPSTF Grade B recommendation for women 40-74',
    colonoscopy: 'USPSTF Grade A recommendation for adults 45-75',
    pap_smear: 'USPSTF Grade A recommendation for women 21-65',
    ldct_lung: 'USPSTF Grade B recommendation for high-risk adults 50-80',
    lipid_panel: 'ACC/AHA recommendation for ASCVD risk assessment',
    hba1c: 'ADA recommendation for diabetes monitoring',
    dexa: 'USPSTF Grade B recommendation for women 65+ or at-risk',
    depression_screening: 'USPSTF Grade B recommendation for all adults',
  };
  return evidence[screeningType] || 'Clinical guideline recommendation';
}

interface RouteParams {
  params: {
    patientId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = performance.now();

  try {
    // Check for internal agent gateway token first
    let userId: string | undefined;
    const internalToken = request.headers.get('X-Agent-Internal-Token');

    if (internalToken && verifyInternalToken(internalToken)) {
      const userEmail = request.headers.get('X-Agent-User-Email');
      const headerUserId = request.headers.get('X-Agent-User-Id');
      if (userEmail) {
        const dbUser = await prisma.user.findFirst({
          where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
          select: { id: true },
        });
        userId = dbUser?.id;
      }
    }

    // Fall back to session auth
    if (!userId) {
      const session = await auth();
      userId = (session?.user as any)?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const { patientId } = params;

    // Fetch all data in parallel for optimal latency
    const [
      patient,
      riskScoresResult,
      preventionPlansResult,
      screeningOutcomesResult,
      encounterLinksResult,
    ] = await Promise.allSettled([
      prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          email: true,
          phone: true,
          city: true,
          state: true,
        },
      }),
      prisma.riskScore.findMany({
        where: { patientId },
        orderBy: { calculatedAt: 'desc' },
        take: 10,
      }),
      prisma.preventionPlan.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.screeningOutcome.findMany({
        where: { patientId },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.preventionEncounterLink.findMany({
        where: { preventionPlanId: { in: [] } }, // Will be populated from plans
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Log any query failures
    if (riskScoresResult.status === 'rejected') {
      logger.error({
        event: 'prevention_hub_risk_scores_failed',
        patientId,
        error: riskScoresResult.reason,
      });
    }

    // Check patient result
    if (patient.status === 'rejected') {
      logger.error({
        event: 'prevention_hub_patient_query_failed',
        patientId,
        error: patient.reason,
      });
      return NextResponse.json(
        { error: 'Failed to fetch patient data' },
        { status: 500 }
      );
    }

    if (!patient.value) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const patientRecord = patient.value;

    // Extract results with fallbacks for failures
    const riskScores =
      riskScoresResult.status === 'fulfilled' ? riskScoresResult.value : [];
    const preventionPlans =
      preventionPlansResult.status === 'fulfilled' ? preventionPlansResult.value : [];
    const screeningOutcomes =
      screeningOutcomesResult.status === 'fulfilled' ? screeningOutcomesResult.value : [];

    // Map risk scores to hub format
    const hubRiskScores: HubRiskScore[] = riskScores.map((risk) => ({
      id: risk.id,
      name: RISK_TYPE_NAMES[risk.riskType] || risk.riskType,
      score: risk.score,
      level: mapCategoryToLevel(risk.category),
      lastCalculated: risk.calculatedAt,
      nextDue: new Date(risk.calculatedAt.getTime() + 365 * 24 * 60 * 60 * 1000),
    }));

    // Build interventions from screenings and plan recommendations
    const activeInterventions: HubIntervention[] = [];
    const completedInterventions: HubIntervention[] = [];

    // Process screening outcomes
    for (const screening of screeningOutcomes) {
      const status = calculateStatus(
        screening.dueDate,
        screening.completedDate,
        screening.scheduledDate
      );

      const intervention: HubIntervention = {
        id: screening.id,
        name: getScreeningDisplayName(screening.screeningType),
        domain: SCREENING_TO_DOMAIN[screening.screeningType] || 'cardiometabolic',
        type: mapToInterventionType(screening.screeningType),
        status,
        dueDate: screening.dueDate || undefined,
        completedDate: screening.completedDate || undefined,
        scheduledDate: screening.scheduledDate || undefined,
        description: screening.description || getScreeningEvidence(screening.screeningType),
        evidence: getScreeningEvidence(screening.screeningType),
      };

      if (status === 'completed') {
        completedInterventions.push(intervention);
      } else {
        activeInterventions.push(intervention);
      }
    }

    // Process prevention plan goals as interventions
    for (const plan of preventionPlans) {
      if (plan.status !== 'ACTIVE') continue;

      const goals = plan.goals as Array<{
        goal: string;
        targetDate?: string;
        status: string;
        category?: string;
        evidence?: string;
      }>;

      for (const goal of goals || []) {
        // Determine domain from plan type
        let domain: HealthDomain = 'cardiometabolic';
        if (plan.planType === 'CANCER_SCREENING') domain = 'oncology';
        if (plan.planType === 'DIABETES') domain = 'cardiometabolic';
        if (plan.planType === 'CARDIOVASCULAR') domain = 'cardiometabolic';

        // Determine status
        let status: InterventionStatus = 'due';
        if (goal.status === 'COMPLETED') status = 'completed';
        else if (goal.status === 'IN_PROGRESS') status = 'scheduled';

        const intervention: HubIntervention = {
          id: `${plan.id}-${goal.goal.slice(0, 10)}`,
          name: goal.goal,
          domain,
          type: goal.category === 'medication' ? 'medication' : 'lifestyle',
          status,
          description: goal.evidence || plan.description || '',
          evidence: plan.evidenceLevel || plan.guidelineSource || '',
          aiRecommendation:
            plan.aiGeneratedBy
              ? `AI-generated recommendation (confidence: ${(plan.aiConfidence || 0) * 100}%)`
              : undefined,
        };

        if (status === 'completed') {
          completedInterventions.push(intervention);
        } else {
          activeInterventions.push(intervention);
        }
      }
    }

    // Calculate summary
    const overdueCount = activeInterventions.filter((i) => i.status === 'overdue').length;
    const dueCount = activeInterventions.filter((i) => i.status === 'due').length;
    const scheduledCount = activeInterventions.filter((i) => i.status === 'scheduled').length;

    const processingTime = performance.now() - startTime;

    logger.info({
      event: 'prevention_hub_data_fetched',
      patientId,
      riskScoreCount: hubRiskScores.length,
      activeInterventionCount: activeInterventions.length,
      completedInterventionCount: completedInterventions.length,
      overdueCount,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patientRecord.id,
          age: calculateAge(patientRecord.dateOfBirth),
          gender: patientRecord.gender || 'unknown',
          firstName: patientRecord.firstName,
          lastName: patientRecord.lastName,
        },
        riskScores: hubRiskScores,
        activeInterventions,
        completedInterventions,
        summary: {
          overdueCount,
          dueCount,
          scheduledCount,
          completedCount: completedInterventions.length,
          totalActive: activeInterventions.length,
        },
        processingTimeMs: processingTime,
      },
    });
  } catch (error) {
    logger.error({
      event: 'prevention_hub_fetch_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch prevention hub data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
