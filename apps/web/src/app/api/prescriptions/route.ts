/**
 * Prescription API - Create Prescription
 *
 * POST /api/prescriptions - Create new prescription with blockchain hash
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { emitMedicationEvent } from '@/lib/socket-server';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { cdsEngine } from '@/lib/cds/engines/cds-engine';
import type { CDSContext, CDSHookType } from '@/lib/cds/types';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/prescriptions
 * Create new prescription with e-signature
 * SECURITY: Enforces tenant isolation - clinicians can only create prescriptions for their own patients
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

      // Validate required fields
      const requiredFields = ['patientId', 'medications', 'signatureMethod', 'signatureData'];
      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 }
          );
        }
      }

      // ===================================================================
      // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
      // ===================================================================
      // Verify the patient belongs to this clinician
      const patient = await prisma.patient.findUnique({
        where: { id: body.patientId },
        select: { assignedClinicianId: true },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      // Only ADMIN or assigned clinician can create prescriptions for this patient
      if (
        patient.assignedClinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot create prescriptions for this patient' },
          { status: 403 }
        );
      }

      // Use authenticated user ID as clinician
      const clinicianId = context.user.id;

      // Generate prescription hash for blockchain
      const prescriptionData = {
        patientId: body.patientId,
        clinicianId,
        medications: body.medications,
        timestamp: new Date().toISOString(),
      };

      const prescriptionHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(prescriptionData))
        .digest('hex');

      // Create prescription
      const prescription = await prisma.prescription.create({
        data: {
          patientId: body.patientId,
          clinicianId,
          prescriptionHash,
          medications: body.medications,
          instructions: body.instructions || '',
          diagnosis: body.diagnoses || body.diagnosis || '',
          signatureMethod: body.signatureMethod,
          signatureData: body.signatureData,
          signedAt: new Date(),
          status: 'SIGNED',
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              licenseNumber: true,
            },
          },
        },
      });

      // Create individual medication records
      const medicationPromises = body.medications.map((med: any) => {
        return prisma.medication.create({
          data: {
            patientId: body.patientId,
            name: med.name,
            genericName: med.genericName || med.name,
            dose: med.dose,
            frequency: med.frequency,
            route: med.route || 'oral',
            instructions: med.instructions || '',
            startDate: new Date(),
            isActive: true,
            prescribedBy: clinicianId,
            prescriptionHash,
          },
        });
      });

      const createdMedications = await Promise.all(medicationPromises);

      // Emit Socket.IO events for real-time UI updates
      const patientName = prescription.patient
        ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
        : undefined;

      createdMedications.forEach((med) => {
        emitMedicationEvent({
          id: med.id,
          action: 'created',
          patientId: body.patientId,
          patientName,
          medicationName: med.name,
          dose: med.dose || undefined,
          frequency: med.frequency || undefined,
          userId: clinicianId,
          userName: context.user.name || context.user.email,
        });
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: clinicianId,
          userEmail: context.user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'Prescription',
          resourceId: prescription.id,
          details: {
            medicationCount: body.medications.length,
            prescriptionHash,
          },
          success: true,
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.PRESCRIPTION_CREATED,
        clinicianId,
        {
          medicationCount: body.medications.length,
          signatureMethod: body.signatureMethod,
          hasDiagnosis: !!body.diagnosis,
          hasInstructions: !!body.instructions,
          success: true
        }
      );

      // Non-blocking CDS safety net: evaluate drug interactions post-save
      // The frontend should ALSO call /api/cds/evaluate BEFORE creating the prescription.
      // This is a backstop to catch anything the frontend missed.
      let cdsSafetyAlerts: any[] = [];
      try {
        const cdsContext: CDSContext = {
          patientId: body.patientId,
          userId: clinicianId,
          hookInstance: uuidv4(),
          hookType: 'medication-prescribe' as CDSHookType,
          context: {
            patientId: body.patientId,
            medications: body.medications.map((med: any, idx: number) => ({
              id: `rx-${idx}`,
              name: med.name,
              genericName: med.genericName || med.name,
              dosage: med.dose,
              frequency: med.frequency,
              route: med.route || 'oral',
              status: 'active' as const,
            })),
          },
        };

        const cdsResult = await cdsEngine.evaluate(cdsContext);
        if (cdsResult.alerts?.length > 0) {
          cdsSafetyAlerts = cdsResult.alerts;
        }
      } catch {
        // CDS safety net is non-blocking — prescription already created
      }

      return NextResponse.json(
        {
          success: true,
          data: prescription,
          message: 'Prescription created successfully',
          ...(cdsSafetyAlerts.length > 0 ? {
            cdsSafetyAlerts,
            cdsSafetyWarning: `${cdsSafetyAlerts.length} clinical alert(s) detected post-prescription. Review recommended.`,
          } : {}),
        },
        { status: 201 }
      );
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create prescription' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'Prescription' },
  }
);

/**
 * GET /api/prescriptions?patientId=xxx OR /api/prescriptions (all for clinician)
 * Get prescriptions for a patient OR all prescriptions for logged-in clinician
 * SECURITY: Enforces tenant isolation - clinicians can only view their own prescriptions
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const status = searchParams.get('status'); // Optional filter by status

      // If patientId is provided, get prescriptions for that patient
      if (patientId) {
        // ===================================================================
        // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
        // ===================================================================
        // Verify the patient belongs to this clinician
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { assignedClinicianId: true },
        });

        if (!patient) {
          return NextResponse.json(
            { error: 'Patient not found' },
            { status: 404 }
          );
        }

        // Only ADMIN or assigned clinician can view prescriptions for this patient
        if (
          patient.assignedClinicianId !== context.user.id &&
          context.user.role !== 'ADMIN'
        ) {
          return NextResponse.json(
            { error: 'Forbidden: You cannot access prescriptions for this patient' },
            { status: 403 }
          );
        }

        const prescriptions = await prisma.prescription.findMany({
          where: {
            patientId,
            ...(status && { status: status as any }),
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                tokenId: true,
              },
            },
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                licenseNumber: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
          success: true,
          data: prescriptions,
        });
      }

      // Otherwise, get all prescriptions for this clinician
      const prescriptions = await prisma.prescription.findMany({
        where: {
          clinicianId: context.user.id,
          ...(status && { status: status as any }),
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
              dateOfBirth: true,
            },
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              licenseNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit to 100 most recent prescriptions
      });

      return NextResponse.json({
        success: true,
        data: prescriptions,
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch prescriptions' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'Prescription' },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);
