/**
 * HL7 ORU Message Ingestion API
 *
 * POST /api/hl7/oru - Ingest HL7 ORU messages and create lab results
 *
 * Supports HL7 v2.x ORU messages:
 * - ORU^R01: Unsolicited observation results
 * - ORU^R03: Display-oriented results
 *
 * Request body: Raw HL7 message (text/plain or application/hl7-v2)
 * Response: JSON with created lab result IDs
 *
 * Phase: Telehealth & Lab Integration (OSS: HL7 ORU)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseORU, ORUParser, type ObservationResult } from '@/lib/hl7/oru-parser';
import { auditCreate } from '@/lib/audit';
import logger from '@/lib/logger';
import { LabResultStatus } from '@prisma/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Map HL7 result status to Prisma LabResultStatus
 */
function mapResultStatus(hl7Status: string): LabResultStatus {
  const statusMap: Record<string, LabResultStatus> = {
    F: 'FINAL',
    P: 'PRELIMINARY',
    C: 'CORRECTED',
    X: 'CANCELLED',
    R: 'PRELIMINARY', // Results stored, not verified -> treat as preliminary
    A: 'PRELIMINARY', // Some results available
  };
  return statusMap[hl7Status] || 'PRELIMINARY';
}

/**
 * Map abnormal flags to interpretation string
 */
function getInterpretation(flags: string[]): string | null {
  if (!flags || flags.length === 0) return 'Normal';

  const flagMap: Record<string, string> = {
    H: 'High',
    L: 'Low',
    HH: 'Critical High',
    LL: 'Critical Low',
    A: 'Abnormal',
    AA: 'Very Abnormal',
    N: 'Normal',
  };

  // Return the most severe interpretation
  if (flags.includes('HH') || flags.includes('LL')) {
    return flags.includes('HH') ? 'Critical High' : 'Critical Low';
  }
  if (flags.includes('AA')) return 'Very Abnormal';
  if (flags.includes('A')) return 'Abnormal';
  if (flags.includes('H')) return 'High';
  if (flags.includes('L')) return 'Low';

  return flagMap[flags[0]] || 'Abnormal';
}

/**
 * Generate hash for lab result integrity
 */
function generateResultHash(result: ObservationResult, patientId: string): string {
  const data = JSON.stringify({
    patientId,
    observationId: result.observationId,
    value: result.value,
    resultDateTime: result.observationDateTime?.toISOString(),
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Categorize lab test based on LOINC code or test name
 */
function categorizeTest(testCode: string | undefined, testName: string): string {
  const name = testName.toLowerCase();

  // Hematology
  if (
    name.includes('cbc') ||
    name.includes('wbc') ||
    name.includes('rbc') ||
    name.includes('hemoglobin') ||
    name.includes('hematocrit') ||
    name.includes('platelet') ||
    name.includes('mcv')
  ) {
    return 'Hematology';
  }

  // Chemistry
  if (
    name.includes('glucose') ||
    name.includes('creatinine') ||
    name.includes('bun') ||
    name.includes('sodium') ||
    name.includes('potassium') ||
    name.includes('chloride') ||
    name.includes('co2') ||
    name.includes('calcium')
  ) {
    return 'Chemistry';
  }

  // Lipid Panel
  if (
    name.includes('cholesterol') ||
    name.includes('triglyceride') ||
    name.includes('hdl') ||
    name.includes('ldl')
  ) {
    return 'Lipid Panel';
  }

  // Liver Function
  if (
    name.includes('ast') ||
    name.includes('alt') ||
    name.includes('bilirubin') ||
    name.includes('albumin') ||
    name.includes('alkaline phosphatase')
  ) {
    return 'Liver Function';
  }

  // Thyroid
  if (
    name.includes('tsh') ||
    name.includes('t3') ||
    name.includes('t4') ||
    name.includes('thyroid')
  ) {
    return 'Thyroid';
  }

  // Urinalysis
  if (name.includes('urine') || name.includes('ua ')) {
    return 'Urinalysis';
  }

  // Microbiology
  if (
    name.includes('culture') ||
    name.includes('susceptible') ||
    name.includes('resistant')
  ) {
    return 'Microbiology';
  }

  return 'Other';
}

/**
 * POST /api/hl7/oru
 * Ingest HL7 ORU message and create lab results
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    // Parse request body as text
    const contentType = request.headers.get('content-type') || '';
    let hl7Message: string;

    if (
      contentType.includes('application/hl7-v2') ||
      contentType.includes('text/plain')
    ) {
      hl7Message = await request.text();
    } else {
      // Try to parse as JSON
      try {
        const json = await request.json();
        hl7Message = json.message || json.hl7 || json.data;
      } catch {
        return NextResponse.json(
          {
            error: 'Invalid content type',
            message:
              'Expected text/plain, application/hl7-v2, or JSON with message field',
          },
          { status: 400 }
        );
      }
    }

    if (!hl7Message || hl7Message.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Empty message',
          message: 'HL7 message body is required',
        },
        { status: 400 }
      );
    }

    // Validate HL7 message format
    const validation = ORUParser.validate(hl7Message);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid HL7 message',
          message: 'HL7 ORU message format validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Parse HL7 ORU message
    let parsedORU;
    try {
      parsedORU = parseORU(hl7Message);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'HL7 parsing failed',
          message: error instanceof Error ? error.message : 'Failed to parse HL7 message',
        },
        { status: 400 }
      );
    }

    // Find patient by external MRN
    const { patient, orders } = parsedORU;

    if (!patient.externalMrn && !patient.patientId) {
      return NextResponse.json(
        {
          error: 'Missing patient identifier',
          message: 'Patient MRN or ID is required in PID segment',
        },
        { status: 400 }
      );
    }

    // Find existing patient
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: [
          { externalMrn: patient.externalMrn },
          { mrn: patient.patientId },
        ],
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        {
          error: 'Patient not found',
          message: `No patient found with MRN ${patient.externalMrn || patient.patientId}. Register patient first using ADT message.`,
        },
        { status: 404 }
      );
    }

    // Process each order and its results
    const createdResults: Array<{
      id: string;
      testName: string;
      testCode: string | undefined;
      status: string;
      isAbnormal: boolean;
      isCritical: boolean;
    }> = [];

    const criticalAlerts: Array<{
      testName: string;
      value: string;
      referenceRange: string | undefined;
      flags: string[];
    }> = [];

    for (const order of orders) {
      for (const result of order.results) {
        // Determine if result is abnormal or critical
        const isAbnormal = ORUParser.isAbnormalResult(result);
        const isCritical = ORUParser.isCriticalResult(result);

        // Create lab result
        const labResult = await prisma.labResult.create({
          data: {
            patientId: existingPatient.id,
            testName: result.observationName,
            testCode: result.loincCode || result.observationId,
            category: categorizeTest(result.loincCode, result.observationName),
            orderingDoctor: order.orderingProvider,
            performingLab: parsedORU.sendingFacility,
            value: result.value,
            unit: result.units,
            referenceRange: result.referenceRange,
            status: mapResultStatus(result.resultStatus),
            interpretation: getInterpretation(result.abnormalFlags || []),
            isAbnormal,
            isCritical,
            orderedDate: order.requestedDateTime,
            collectedDate: order.observationDateTime,
            sampleCollectedAt: order.observationDateTime,
            resultDate: result.observationDateTime || new Date(),
            notes: order.notes.length > 0 ? order.notes.join('\n') : undefined,
            resultHash: generateResultHash(result, existingPatient.id),
          },
        });

        createdResults.push({
          id: labResult.id,
          testName: labResult.testName,
          testCode: labResult.testCode || undefined,
          status: labResult.status,
          isAbnormal: labResult.isAbnormal,
          isCritical: labResult.isCritical,
        });

        // Track critical alerts for notification
        if (isCritical) {
          criticalAlerts.push({
            testName: result.observationName,
            value: result.value,
            referenceRange: result.referenceRange,
            flags: result.abnormalFlags || [],
          });
        }

        // Audit each result creation
        await auditCreate('LabResult', labResult.id, request, {
          patientId: existingPatient.id,
          patientMrn: existingPatient.mrn,
          source: 'HL7_ORU',
          messageType: parsedORU.messageType,
          eventType: parsedORU.eventType,
          messageControlId: parsedORU.messageControlId,
          sendingFacility: parsedORU.sendingFacility,
          testName: result.observationName,
          testCode: result.loincCode,
          isAbnormal,
          isCritical,
        });
      }
    }

    const elapsed = performance.now() - start;

    // Log summary
    logger.info({
      event: 'hl7_oru_ingested',
      messageControlId: parsedORU.messageControlId,
      patientId: existingPatient.id,
      patientMrn: existingPatient.mrn,
      totalResults: createdResults.length,
      abnormalCount: createdResults.filter((r) => r.isAbnormal).length,
      criticalCount: criticalAlerts.length,
      sendingFacility: parsedORU.sendingFacility,
      latencyMs: elapsed.toFixed(2),
    });

    // Return response with critical alerts highlighted
    return NextResponse.json(
      {
        success: true,
        patientId: existingPatient.id,
        patientMrn: existingPatient.mrn,
        results: createdResults,
        summary: {
          totalResults: createdResults.length,
          abnormalCount: createdResults.filter((r) => r.isAbnormal).length,
          criticalCount: criticalAlerts.length,
        },
        criticalAlerts: criticalAlerts.length > 0 ? criticalAlerts : undefined,
        hl7: {
          messageType: parsedORU.messageType,
          eventType: parsedORU.eventType,
          messageControlId: parsedORU.messageControlId,
          sendingFacility: parsedORU.sendingFacility,
          timestamp: parsedORU.timestamp,
        },
        meta: {
          latencyMs: Math.round(elapsed),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'hl7_oru_ingestion_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process HL7 ORU message',
      },
      { status: 500 }
    );
  }
}
