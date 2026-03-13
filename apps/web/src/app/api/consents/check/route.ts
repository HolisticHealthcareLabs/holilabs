/**
 * Check User Consent Status API Route
 *
 * Checks if user has accepted all required consents
 * @route GET /api/consents/check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const REQUIRED_CONSENTS = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'HIPAA_NOTICE',
  'EHR_CONSENT',
];

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: { user?: { id: string; email?: string } }) => {
    try {
      // Get user's patient record via PatientUser
      const patientUser = await prisma.patientUser.findUnique({
        where: { email: context.user?.email! },
        include: {
          patient: {
            include: {
              consents: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!patientUser || !patientUser.patient) {
        return NextResponse.json({
          allAccepted: false,
          missingConsents: REQUIRED_CONSENTS,
          consents: [],
        });
      }

      const patient = patientUser.patient;
      const activeConsents = patient.consents || [];

      // Check which required consents are missing
      const acceptedTypes = new Set(activeConsents.map((c) => c.type));
      const missingConsents = REQUIRED_CONSENTS.filter(
        (type) => !acceptedTypes.has(type as any)
      );

      return NextResponse.json({
        allAccepted: missingConsents.length === 0,
        missingConsents,
        consents: activeConsents.map((c) => ({
          type: c.type,
          title: c.title,
          version: c.version,
          signedAt: c.signedAt,
        })),
      });
    } catch (error) {
      logger.error('Error checking consents:', error);
      return NextResponse.json(
        { error: 'Failed to check consents' },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], allowPatientAuth: true, audit: { action: 'READ', resource: 'ConsentCheck' } }
);
