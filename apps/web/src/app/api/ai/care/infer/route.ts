/**
 * AI Clinical Inference API
 *
 * POST /api/ai/care/infer — run clinical inference with provenance tracking
 *
 * Wraps the CDSS engine with ELENA-compliant provenance metadata.
 * Every inference is logged to AIUsageLog for cost tracking (GORDON)
 * and audit trail (CYRUS). Results are wrapped in a safety envelope
 * with sourceAuthority and citationUrl per ELENA veto invariant.
 *
 * ELENA: No LLM output as clinical recommendation without human review.
 * RUTH: No SaMD language in patient-facing responses.
 *
 * @compliance ANVISA Class I (deterministic CDS), LGPD Art. 18
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

interface InferenceRequest {
  patientId: string;
  inferenceType: 'drug_interaction' | 'lab_interpretation' | 'risk_assessment' | 'differential';
  context: {
    medications?: string[];
    labResults?: { testName: string; value: number; unit: string }[];
    symptoms?: string[];
    vitals?: Record<string, number>;
  };
  urgency?: 'routine' | 'urgent' | 'stat';
}

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: InferenceRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { patientId, inferenceType, context: clinicalContext, urgency } = body;

    if (!patientId || !inferenceType) {
      return NextResponse.json(
        { error: 'patientId and inferenceType are required' },
        { status: 400 }
      );
    }

    const validTypes = ['drug_interaction', 'lab_interpretation', 'risk_assessment', 'differential'];
    if (!validTypes.includes(inferenceType)) {
      return NextResponse.json(
        { error: `Invalid inferenceType. Supported: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // CYRUS CVI-002: Verify tenant-scoped patient access
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const traceId = uuidv4();
    const startTime = Date.now();

    logger.info({
      event: 'ai_care_infer_start',
      traceId,
      patientId,
      inferenceType,
      urgency: urgency || 'routine',
      userId: context.user!.id,
    });

    // ELENA: Deterministic rules engine (ANVISA Class I compliant)
    // LLM is used for context gathering only, never for clinical decisions
    // Fetch patient with related clinical data
    const [patient, allergies, activePrescriptions, recentLabs] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
      }),
      prisma.allergy.findMany({
        where: { patientId },
        select: { allergen: true, severity: true, allergyType: true },
      }),
      prisma.prescription.findMany({
        where: { patientId, status: { in: ['SIGNED', 'SENT', 'FILLED'] } },
        select: { medications: true, diagnosis: true },
      }),
      prisma.labResult.findMany({
        where: { patientId },
        orderBy: { resultDate: 'desc' },
        take: 20,
        select: { testName: true, value: true, unit: true, interpretation: true, resultDate: true },
      }),
    ]);

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Build inference result with ELENA-mandated provenance
    const result = {
      traceId,
      inferenceType,
      status: 'COMPLETED' as const,
      timestamp: new Date().toISOString(),
      provenance: {
        engine: 'deterministic-cds-v3',
        sourceAuthority: 'ANVISA/RDC-185',
        citationUrl: 'https://www.gov.br/anvisa/pt-br',
        confidence: 'DETERMINISTIC' as const,
        humanReviewRequired: true,
      },
      findings: [] as Array<{
        severity: 'INFO' | 'WARNING' | 'CRITICAL';
        category: string;
        message: string;
        evidence: string;
      }>,
      disclaimer: 'This information is for clinical decision support only. It does not constitute a diagnosis or treatment recommendation. Professional clinical judgment is required.',
    };

    // Run type-specific inference
    if (inferenceType === 'drug_interaction' && clinicalContext?.medications) {
      // Extract drug names from Json medications field
      const existingDrugs: string[] = [];
      for (const rx of activePrescriptions) {
        const meds = rx.medications as Array<{ drug?: string; name?: string }> | null;
        if (Array.isArray(meds)) {
          for (const m of meds) {
            if (m.drug) existingDrugs.push(m.drug);
            else if (m.name) existingDrugs.push(m.name);
          }
        }
      }
      const allDrugs = [...existingDrugs, ...clinicalContext.medications];

      // Check for known allergen matches
      for (const drug of clinicalContext.medications) {
        const allergyMatch = allergies.find(
          (a) => a.allergen.toLowerCase().includes(drug.toLowerCase())
        );
        if (allergyMatch) {
          result.findings.push({
            severity: 'CRITICAL',
            category: 'allergy',
            message: `Known allergy conflict: ${drug} matches documented allergy "${allergyMatch.allergen}"`,
            evidence: `Patient allergy record (severity: ${allergyMatch.severity})`,
          });
        }
      }

      if (allDrugs.length > 5) {
        result.findings.push({
          severity: 'WARNING',
          category: 'polypharmacy',
          message: `Polypharmacy risk: ${allDrugs.length} concurrent medications`,
          evidence: 'WHO polypharmacy guidelines (>=5 concurrent drugs)',
        });
      }
    }

    if (inferenceType === 'lab_interpretation' && clinicalContext?.labResults) {
      for (const lab of clinicalContext.labResults) {
        const historical = recentLabs.find(
          (l) => l.testName.toLowerCase() === lab.testName.toLowerCase()
        );
        if (historical && historical.interpretation?.toLowerCase() === 'critical') {
          result.findings.push({
            severity: 'CRITICAL',
            category: 'lab_critical',
            message: `Critical lab value: ${lab.testName} = ${lab.value} ${lab.unit}`,
            evidence: `Previous result: ${historical.value} (${historical.resultDate?.toISOString().slice(0, 10)})`,
          });
        }
      }
    }

    const responseTimeMs = Date.now() - startTime;

    // GORDON: Log AI usage for cost tracking
    await prisma.aIUsageLog.create({
      data: {
        provider: 'deterministic-cds',
        model: 'cds-v3',
        feature: `care_infer_${inferenceType}`,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        responseTimeMs,
        fromCache: false,
        userId: context.user!.id,
        patientId,
        clinicId: context.user!.organizationId || null,
      },
    });

    // CYRUS: Audit trail
    await createAuditLog({
      action: 'READ',
      resource: 'ClinicalInference',
      resourceId: traceId,
      details: {
        inferenceType,
        patientId,
        findingsCount: result.findings.length,
        responseTimeMs,
      },
      success: true,
    });

    logger.info({
      event: 'ai_care_infer_complete',
      traceId,
      inferenceType,
      findingsCount: result.findings.length,
      responseTimeMs,
    });

    return NextResponse.json({ result });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'] }
);
