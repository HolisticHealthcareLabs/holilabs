/**
 * CDS Hooks Discovery Endpoint
 *
 * Returns list of available CDS services
 * Required by CDS Hooks 2.0 specification
 *
 * GET /api/cds/hooks/discovery
 *
 * @compliance CDS Hooks 2.0
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    logger.info({
      event: 'cds_hooks_discovery',
      baseUrl,
    });

    return NextResponse.json({
      services: [
        {
          hook: 'patient-view',
          id: 'holi-cds-patient-view',
          title: 'Holi CDS: Patient Chart View',
          description: 'Provides contextual clinical decision support when viewing patient chart. Includes WHO PEN protocols, PAHO prevention guidelines, drug interactions, and evidence-based recommendations.',
          prefetch: {
            patient: 'Patient/{{context.patientId}}',
            conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
            medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
            allergies: 'AllergyIntolerance?patient={{context.patientId}}',
            observations: 'Observation?patient={{context.patientId}}&category=vital-signs&_sort=-date&_count=10',
            labResults: 'Observation?patient={{context.patientId}}&category=laboratory&_sort=-date&_count=20',
          },
          useTwoWaySSL: false,
        },
        {
          hook: 'medication-prescribe',
          id: 'holi-cds-medication-prescribe',
          title: 'Holi CDS: Medication Safety Check',
          description: 'Real-time drug-drug interaction checking, drug-allergy alerts, duplicate therapy detection, and contraindication screening based on ONCHigh and DrugBank databases.',
          prefetch: {
            patient: 'Patient/{{context.patientId}}',
            medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
            allergies: 'AllergyIntolerance?patient={{context.patientId}}&verification-status=confirmed',
            conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
          },
          useTwoWaySSL: false,
        },
        {
          hook: 'order-sign',
          id: 'holi-cds-order-sign',
          title: 'Holi CDS: Order Signing Review',
          description: 'Final safety check before orders are signed. Reviews medications, lab orders, and procedures for contraindications and best practices.',
          prefetch: {
            patient: 'Patient/{{context.patientId}}',
            medications: 'MedicationRequest?patient={{context.patientId}}&status=active',
            allergies: 'AllergyIntolerance?patient={{context.patientId}}',
            conditions: 'Condition?patient={{context.patientId}}&clinical-status=active',
            labResults: 'Observation?patient={{context.patientId}}&category=laboratory&_sort=-date&_count=10',
          },
          useTwoWaySSL: false,
        },
        {
          hook: 'encounter-start',
          id: 'holi-cds-encounter-start',
          title: 'Holi CDS: Encounter Start Screening',
          description: 'Preventive care reminders, screening recommendations (PAHO integrated NCD screening), immunization status, and care gaps when starting a patient encounter.',
          prefetch: {
            patient: 'Patient/{{context.patientId}}',
            conditions: 'Condition?patient={{context.patientId}}',
            procedures: 'Procedure?patient={{context.patientId}}&_sort=-date&_count=20',
            immunizations: 'Immunization?patient={{context.patientId}}&_sort=-date',
            observations: 'Observation?patient={{context.patientId}}&category=vital-signs&_sort=-date&_count=5',
          },
          useTwoWaySSL: false,
        },
      ],
    });
  } catch (error) {
    logger.error({
      event: 'cds_hooks_discovery_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve CDS Hooks discovery information',
      },
      { status: 500 }
    );
  }
}
