/**
 * POST /api/copilot/draft-prescription
 *
 * AI Copilot → Prescription Pipeline.
 *
 * Accepts a clinical SOAP note, extracts medications via Gemini structured
 * output, then immediately runs those medications through the deterministic
 * safety-check service (DOAC, attestation, CDS, billing guardrails).
 *
 * This is the "Hallucination Firewall": generative AI proposes, deterministic
 * rules approve or block. The LLM never touches the final clinical decision.
 *
 * Flow:
 *   1. Parse request (patientId, encounterId, soapNote required)
 *   2. extractMedicationsFromNote(soapNote) → ExtractedMedication[]
 *   3. evaluatePrescriptionSafety(medications, ...) → PrescriptionSafetyResult
 *   4. Return merged response with traffic-light color + all alerts
 *
 * @compliance ANVISA Class I — LLMs for context only, deterministic rules decide
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { extractMedicationsFromNote } from '@/lib/ai/prescription-extractor';
import {
  evaluatePrescriptionSafety,
  type PrescriptionSafetyResult,
} from '@/lib/clinical/safety/evaluate-prescription';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      patientId,
      encounterId,
      soapNote,
      icd10Codes,
      payer,
      clinicalContext,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────────

    if (!patientId) {
      return NextResponse.json({ error: 'Missing required field: patientId' }, { status: 400 });
    }
    if (!encounterId) {
      return NextResponse.json({ error: 'Missing required field: encounterId' }, { status: 400 });
    }
    if (!soapNote || typeof soapNote !== 'string' || soapNote.trim().length === 0) {
      return NextResponse.json({ error: 'Missing required field: soapNote (non-empty string)' }, { status: 400 });
    }

    const actorId = context.user?.id ?? 'system';
    const traceId = uuidv4();

    // ── Step 1: Extract medications from SOAP note ──────────────────────────────

    let extraction: Awaited<ReturnType<typeof extractMedicationsFromNote>>;
    try {
      extraction = await extractMedicationsFromNote(soapNote);
    } catch (error) {
      // Config error (missing API key) or unrecoverable failure
      return NextResponse.json(
        { error: 'Extraction service unavailable. Verify GOOGLE_AI_API_KEY.' },
        { status: 503 }
      );
    }

    const { medications, model, extractionTimeMs } = extraction;

    // ── Step 2: Handle empty extraction ────────────────────────────────────────

    if (medications.length === 0) {
      return NextResponse.json({
        extractedMedications: [],
        safetyCheck: {
          color: 'GREEN',
          signal: [],
          attestationRequired: false,
          missingFields: [],
          financialRisk: { glosaRisk: false, rulesFired: [] },
          processingTimeMs: 0,
          governance: {
            legalBasis: 'FDA 21 CFR Part 11 + HIPAA 45 CFR §164.312(b) + LGPD Art. 11',
            timestamp: new Date().toISOString(),
          },
        } satisfies PrescriptionSafetyResult,
        extraction: { model, extractionTimeMs, medicationCount: 0 },
        governance: {
          legalBasis: 'FDA 21 CFR Part 11 + HIPAA 45 CFR §164.312(b) + LGPD Art. 11',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ── Step 3: Run deterministic safety evaluation ─────────────────────────────

    const safetyCheck = await evaluatePrescriptionSafety(
      medications,
      { icd10Codes: icd10Codes ?? [] },
      payer,
      clinicalContext,
      { actorId, patientId, traceId }
    );

    // ── Step 4: Return merged response ─────────────────────────────────────────

    return NextResponse.json({
      extractedMedications: medications,
      safetyCheck,
      extraction: {
        model,
        extractionTimeMs,
        medicationCount: medications.length,
      },
      governance: {
        legalBasis: 'FDA 21 CFR Part 11 + HIPAA 45 CFR §164.312(b) + LGPD Art. 11',
        timestamp: new Date().toISOString(),
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
    skipCsrf: false,
  }
);
