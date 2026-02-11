/**
 * Patient API - Individual Operations
 *
 * GET    /api/patients/[id] - Get patient details
 * PUT    /api/patients/[id] - Update patient
 * DELETE /api/patients/[id] - Soft delete patient
 *
 * @compliance Phase 2.4: Security Hardening - IDOR Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';
import { auditView, auditUpdate, auditDelete } from '@/lib/audit';
import { UpdatePatientSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { onPatientUpdated } from '@/lib/cache/patient-context-cache';
import { createProtectedRoute, verifyPatientAccess } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { getSyntheticPatients, isDemoClinician } from '@/lib/demo/synthetic';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


/**
 * GET /api/patients/[id]
 * Get detailed patient information
 * HIPAA §164.502(b) - Requires access reason for PHI access
 * @security IDOR protection - verifies user has access to patient
 */
export const GET = createProtectedRoute(
  async (request, context) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID required' },
        { status: 400 }
      );
    }

    // ================================================================
    // DEMO MODE (DB-FREE): Return synthetic patient, no HIPAA prompts
    // ================================================================
    if (isDemoClinician(context.user!.id, context.user!.email)) {
      const p = getSyntheticPatients().find((x) => x.id === patientId);
      if (!p) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
      return NextResponse.json(
        {
          success: true,
          data: {
            ...p,
            assignedClinicianId: context.user!.id,
            assignedClinician: {
              id: context.user!.id,
              firstName: 'Demo',
              lastName: 'Clinician',
              email: context.user!.email,
              specialty: 'General Practice',
              licenseNumber: null,
            },
            medications: [],
            allergies: [],
            diagnoses: [],
            appointments: [],
          },
        },
        { status: 200 }
      );
    }

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    // HIPAA §164.502(b) - Access Reason Required
    const { searchParams } = new URL(request.url);
    const accessReason = searchParams.get('accessReason');
    const accessPurpose = searchParams.get('accessPurpose');

    const validAccessReasons = [
      'DIRECT_PATIENT_CARE',
      'CARE_COORDINATION',
      'EMERGENCY_ACCESS',
      'ADMINISTRATIVE',
      'QUALITY_IMPROVEMENT',
      'BILLING',
      'LEGAL_COMPLIANCE',
      'RESEARCH_IRB_APPROVED',
      'PUBLIC_HEALTH',
    ];

    if (!accessReason || !validAccessReasons.includes(accessReason)) {
      return NextResponse.json(
        {
          error: 'Access reason is required for HIPAA compliance',
          validReasons: validAccessReasons,
          hipaaReference: 'HIPAA §164.502(b) - Minimum Necessary Standard',
        },
        { status: 400 }
      );
    }

    // ✅ HIPAA §164.502(b) - Minimum Necessary: Explicit field selection
    // Only retrieve fields needed for this specific request
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        // Basic identifiers
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        email: true,
        phone: true,
        address: true,

        // Medical identifiers (encrypted)
        mrn: true,
        externalMrn: true,

        // Assignment and status
        assignedClinicianId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        // Related data with explicit field selection
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
            licenseNumber: true,
          },
        },
        medications: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            dose: true,
            frequency: true,
            startDate: true,
            endDate: true,
            notes: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        appointments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            type: true,
            status: true,
            notes: true,
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
          take: 10,
        },
        consents: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            isActive: true,
            signedAt: true,
            expiresAt: true,
          },
          orderBy: { signedAt: 'desc' },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            documentType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        clinicalNotes: {
          select: {
            id: true,
            type: true,
            chiefComplaint: true,
            createdAt: true,
            // Note: Detailed SOAP notes excluded for minimum necessary
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        prescriptions: {
          select: {
            id: true,
            medications: true,
            instructions: true,
            diagnosis: true,
            status: true,
            createdAt: true,
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Create audit log for PHI access with full context and access reason (HIPAA §164.502(b))
    await auditView(
      'Patient',
      patient.id,
      request,
      {
        patientName: `${patient.firstName} ${patient.lastName}`,
        mrn: patient.mrn,
        includesAppointments: patient.appointments?.length || 0,
        includesMedications: patient.medications?.length || 0,
        includesClinicalNotes: patient.clinicalNotes?.length || 0,
      },
      accessReason,
      accessPurpose || undefined
    );

    return NextResponse.json({
      success: true,
      data: patient,
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'READ', resource: 'Patient' },
  }
);

/**
 * PUT /api/patients/[id]
 * Update patient information
 * @security IDOR protection - verifies user has access to patient
 */
export const PUT = createProtectedRoute(
  async (request, context) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID required' },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input with medical-grade Zod schema
    let validatedData;
    try {
      validatedData = UpdatePatientSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Please check your input and try again',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error; // Re-throw non-validation errors
    }

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Prepare update data (using validated data)
    const updateData: any = {};

    // Only update provided fields
    const allowedFields = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'gender',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'postalCode',
      'country',
      'externalMrn',
      'assignedClinicianId',
      'cpf',
      'cns',
      'isPalliativeCare',
    ];

    for (const field of allowedFields) {
      if (validatedData[field as keyof typeof validatedData] !== undefined) {
        updateData[field as keyof typeof updateData] = validatedData[field as keyof typeof validatedData];
      }
    }

    // If critical data changed, regenerate hash
    const criticalFieldsChanged =
      validatedData.firstName ||
      validatedData.lastName ||
      validatedData.dateOfBirth ||
      validatedData.mrn;

    if (criticalFieldsChanged) {
      const dobValue = validatedData.dateOfBirth
        ? (typeof validatedData.dateOfBirth === 'string'
            ? validatedData.dateOfBirth
            : validatedData.dateOfBirth.toISOString())
        : existingPatient.dateOfBirth.toISOString();

      updateData.dataHash = generatePatientDataHash({
        id: existingPatient.id,
        firstName: validatedData.firstName || existingPatient.firstName,
        lastName: validatedData.lastName || existingPatient.lastName,
        dateOfBirth: dobValue,
        mrn: validatedData.mrn || existingPatient.mrn,
      });
      updateData.lastHashUpdate = new Date();
    }

    // Update patient
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      include: {
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log with full user context
    await auditUpdate('Patient', patient.id, request, {
      updatedFields: Object.keys(updateData),
      patientName: `${patient.firstName} ${patient.lastName}`,
      mrn: patient.mrn,
    });

    // Invalidate patient context cache (demographics and full context)
    try {
      await onPatientUpdated(patient.id);
      logger.info({
        event: 'patient_cache_invalidated',
        patientId: patient.id,
        operation: 'update'
      });
    } catch (cacheError) {
      // Don't fail the request if cache invalidation fails
      logger.error({
        event: 'patient_cache_invalidation_error',
        patientId: patient.id,
        error: cacheError instanceof Error ? cacheError.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      data: patient,
      message: 'Patient updated successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'UPDATE', resource: 'Patient' },
  }
);

/**
 * DELETE /api/patients/[id]
 * Soft delete patient (set isActive = false)
 * @security IDOR protection - verifies user has access to patient
 */
export const DELETE = createProtectedRoute(
  async (request, context) => {
    const patientId = context.params?.id;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID required' },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify user has access to this patient
    const hasAccess = await verifyPatientAccess(context.user!.id, patientId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Soft delete (set isActive = false)
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: { isActive: false },
    });

    // Create audit log with full user context
    await auditDelete('Patient', patient.id, request, {
      patientName: `${existingPatient.firstName} ${existingPatient.lastName}`,
      mrn: existingPatient.mrn,
      reason: 'Soft delete (set isActive=false)',
    });

    return NextResponse.json({
      success: true,
      message: 'Patient deactivated successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'ADMIN'],
    audit: { action: 'DELETE', resource: 'Patient' },
  }
);
