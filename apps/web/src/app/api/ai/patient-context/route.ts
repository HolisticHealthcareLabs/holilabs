/**
 * Patient Context API
 *
 * Generate formatted patient context for AI prompts
 *
 * GET /api/ai/patient-context?patientId=xxx&format=full|soap|scribe|summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPatientWithContext } from '@/lib/ai/patient-data-fetcher';
import {
  formatPatientContext,
  formatPatientContextForSOAP,
  formatPatientContextForScribe,
  formatPatientSummary,
} from '@/lib/ai/patient-context-formatter';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const format = searchParams.get('format') || 'full';
    const chiefComplaint = searchParams.get('chiefComplaint');
    const appointmentReason = searchParams.get('appointmentReason');

    // Validate patientId
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    // Fetch patient with all related data
    const patient = await fetchPatientWithContext(patientId);

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Generate context based on format
    let context: any;

    switch (format) {
      case 'soap':
        if (!chiefComplaint) {
          return NextResponse.json(
            { error: 'chiefComplaint is required for SOAP format' },
            { status: 400 }
          );
        }
        context = formatPatientContextForSOAP(patient, chiefComplaint);
        break;

      case 'scribe':
        if (!appointmentReason) {
          return NextResponse.json(
            { error: 'appointmentReason is required for scribe format' },
            { status: 400 }
          );
        }
        context = formatPatientContextForScribe(patient, appointmentReason);
        break;

      case 'summary':
        context = formatPatientSummary(patient);
        break;

      case 'full':
      default:
        context = formatPatientContext(patient);
        break;
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        mrn: patient.mrn,
      },
      format,
      context,
    });
  } catch (error: any) {
    logger.error({
      event: 'patient_context_generation_failed',
      patientId: request.nextUrl.searchParams.get('patientId'),
      format: request.nextUrl.searchParams.get('format'),
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
