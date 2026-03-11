/**
 * Demo Patient Generation API
 *
 * POST /api/onboarding/demo-patient - Create a demo patient for onboarding
 * GET /api/onboarding/demo-patient - Get available demo patient scenarios
 *
 * @compliance GDPR Art. 6 (Lawful processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createDemoPatient, DemoPatientConfig } from '@/lib/demo/demo-patient-generator';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface CreateDemoPatientRequest {
  scenario: 'diabetes' | 'hypertension' | 'preventive' | 'general';
}

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const body: CreateDemoPatientRequest = await request.json();

    if (!body.scenario) {
      return NextResponse.json(
        { error: 'Missing required field: scenario' },
        { status: 400 }
      );
    }

    const validScenarios = ['diabetes', 'hypertension', 'preventive', 'general'];
    if (!validScenarios.includes(body.scenario)) {
      return NextResponse.json(
        {
          error: 'Invalid scenario',
          validScenarios,
        },
        { status: 400 }
      );
    }

    const config: DemoPatientConfig = {
      userId,
      scenario: body.scenario,
    };

    const patient = await createDemoPatient(config);

    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'Patient',
        resourceId: patient.id,
        details: {
          isDemo: true,
          scenario: body.scenario,
          onboarding: true,
        },
        success: true,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Demo patient created successfully',
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        scenario: body.scenario,
      },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);

export const GET = createProtectedRoute(
  async () => {
    const scenarios = [
      {
        id: 'diabetes',
        title: 'Diabetes Management',
        description: 'María González, 60 years old with type 2 diabetes and hypertension',
        features: [
          'HbA1c tracking and lab results',
          'Prevention screening alerts',
          'Medication management',
          'Chronic condition monitoring',
        ],
        icon: '🩺',
      },
      {
        id: 'hypertension',
        title: 'Hypertension Control',
        description: 'Carlos Fernández, 67 years old with controlled blood pressure',
        features: [
          'Blood pressure monitoring',
          'Cardiovascular risk assessment',
          'Medication compliance',
          'Lifestyle recommendations',
        ],
        icon: '❤️',
      },
      {
        id: 'preventive',
        title: 'Preventive Care',
        description: 'Ana Martínez, 39 years old healthy patient for screening',
        features: [
          'Prevention screening recommendations',
          'Health maintenance alerts',
          'Risk factor assessment',
          'Wellness tracking',
        ],
        icon: '✨',
      },
      {
        id: 'general',
        title: 'Acute Care',
        description: 'Roberto Silva, 50 years old with acute respiratory infection',
        features: [
          'Acute visit documentation',
          'Symptom tracking',
          'Treatment plan',
          'Follow-up scheduling',
        ],
        icon: '🏥',
      },
    ];

    return NextResponse.json({
      success: true,
      scenarios,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
