/**
 * POST /api/encounters/[id]/prescriptions
 *
 * Create a prescription linked to a specific encounter.
 * Runs billing guardrails + attestation gate inline.
 *
 * Color logic:
 *   RED (no override) → 422 with alert details
 *   RED (with overrideToken) → 201 flagged
 *   AMBER → 201 with warning
 *   GREEN → 201
 *
 * @compliance FDA 21 CFR Part 11, HIPAA, LGPD, ANVISA Class I
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { checkAttestation } from '@/lib/clinical/safety/attestation-gate';
import { evaluateDOACRule } from '@/lib/clinical/safety/doac-evaluator';
import { checkICD10Match, checkTUSSCode, checkQuantityLimit } from '@/lib/finance/billing-guardrails';
import type { CDSAlert } from '@/lib/cds/types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const DOAC_DRUGS = new Set(['rivaroxaban', 'apixaban', 'edoxaban', 'dabigatran']);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const encounterId = context.params?.id;
    if (!encounterId) {
      return NextResponse.json({ error: 'Missing encounter ID' }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { medications, icd10Codes, clinicalContext, payer, overrideToken } = body;

    if (!Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json({ error: 'Missing required field: medications (non-empty array)' }, { status: 400 });
    }

    // Verify encounter exists and belongs to requesting provider
    const encounter = await prisma.clinicalEncounter.findUnique({
      where: { id: encounterId },
      select: { id: true, patientId: true, providerId: true, status: true },
    });

    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 });
    }

    if (encounter.providerId !== context.user.id && context.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: not the assigned provider' }, { status: 403 });
    }

    // =========================================================================
    // INLINE SAFETY CHECKS
    // =========================================================================

    const allAlerts: CDSAlert[] = [];
    const financialRulesFired: string[] = [];
    const primaryIcd10 = icd10Codes?.[0];
    const payerMaxQuantity = payer?.maxQuantity ?? 30;

    // 1. Attestation gate
    const attestation = checkAttestation({
      medication: medications[0]?.name,
      patient: {
        creatinineClearance: clinicalContext?.creatinineClearance,
        weight: clinicalContext?.weight,
        age: clinicalContext?.age,
        labTimestamp: clinicalContext?.labTimestamp,
      },
    });
    if (attestation.required) {
      allAlerts.push({
        id: uuidv4(),
        ruleId: 'ATT-GATE',
        summary: attestation.message,
        detail: attestation.legalBasis,
        severity: 'warning',
        category: 'guideline-recommendation',
        indicator: 'warning',
        source: { label: 'Attestation Gate' },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. DOAC + financial checks per medication
    for (const med of medications) {
      if (DOAC_DRUGS.has(med.name?.toLowerCase())) {
        const doac = evaluateDOACRule({
          medication: med.name.toLowerCase() as any,
          patient: {
            creatinineClearance: clinicalContext?.creatinineClearance ?? null,
            weight: clinicalContext?.weight ?? null,
            age: clinicalContext?.age ?? null,
            labTimestamp: clinicalContext?.labTimestamp ?? null,
          },
        });
        if (doac.severity !== 'PASS') {
          allAlerts.push({
            id: uuidv4(),
            ruleId: doac.ruleId,
            summary: doac.rationale,
            detail: doac.detailedRationale,
            severity: doac.severity === 'BLOCK' ? 'critical' : 'warning',
            category: doac.severity === 'BLOCK' ? 'contraindication' : 'guideline-recommendation',
            indicator: doac.severity === 'BLOCK' ? 'critical' : 'warning',
            source: { label: 'DOAC Evaluator', url: doac.citationUrl },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const fin001 = checkICD10Match(med.name, primaryIcd10);
      if (fin001) { allAlerts.push(fin001); financialRulesFired.push('FIN-001'); }

      const fin002 = checkTUSSCode(med.tussCode);
      if (fin002) { allAlerts.push(fin002); financialRulesFired.push('FIN-002'); }

      const fin003 = checkQuantityLimit(med.quantity, payerMaxQuantity);
      if (fin003) { allAlerts.push(fin003); financialRulesFired.push('FIN-003'); }
    }

    // =========================================================================
    // COLOR DETERMINATION
    // =========================================================================

    const isRed = allAlerts.some((a) => a.severity === 'critical');

    if (isRed && !overrideToken) {
      return NextResponse.json(
        { error: 'Prescription blocked by safety check', signal: allAlerts },
        { status: 422 }
      );
    }

    // =========================================================================
    // CREATE PRESCRIPTION
    // =========================================================================

    const prescriptionData = {
      patientId: encounter.patientId,
      clinicianId: context.user.id,
      medications,
      diagnosis: primaryIcd10,
    };

    const prescriptionHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...prescriptionData, timestamp: new Date().toISOString() }))
      .digest('hex');

    const prescription = await prisma.prescription.create({
      data: {
        patientId: encounter.patientId,
        clinicianId: context.user.id,
        encounterId,
        medications,
        diagnosis: primaryIcd10,
        prescriptionHash,
        signatureMethod: 'system',
        signatureData: 'encounter-linked',
        refillsAuthorized: 0,
        refillsRemaining: 0,
        daysSupply: medications[0]?.daysSupply,
      },
    });

    if (isRed && overrideToken) {
      return NextResponse.json(
        {
          prescription,
          warning: true,
          overridden: true,
          signal: allAlerts,
          financialRisk: { glosaRisk: financialRulesFired.length > 0, rulesFired: financialRulesFired },
        },
        { status: 201 }
      );
    }

    const hasAmber = allAlerts.length > 0;
    if (hasAmber) {
      return NextResponse.json(
        {
          prescription,
          warning: true,
          signal: allAlerts,
          financialRisk: { glosaRisk: financialRulesFired.length > 0, rulesFired: financialRulesFired },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ prescription }, { status: 201 });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'] }
);
