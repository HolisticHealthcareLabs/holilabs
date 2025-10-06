/**
 * Prescription API - Create Prescription
 *
 * POST /api/prescriptions - Create new prescription with blockchain hash
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import crypto from 'crypto';

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

      await Promise.all(medicationPromises);

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

      return NextResponse.json(
        {
          success: true,
          data: prescription,
          message: 'Prescription created successfully',
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error creating prescription:', error);
      return NextResponse.json(
        { error: 'Failed to create prescription', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'Prescription' },
  }
);

/**
 * GET /api/prescriptions?patientId=xxx
 * Get prescriptions for a patient
 * SECURITY: Enforces tenant isolation - clinicians can only view prescriptions for their own patients
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');

      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId query parameter is required' },
          { status: 400 }
        );
      }

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
        where: { patientId },
        include: {
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
    } catch (error: any) {
      console.error('Error fetching prescriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prescriptions', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'Prescription' },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);
