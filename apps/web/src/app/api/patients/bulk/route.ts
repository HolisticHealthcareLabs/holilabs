/**
 * Bulk Patient Import API
 *
 * POST /api/patients/bulk - Create multiple patients at once
 * @compliance Phase 2.4: Security Hardening
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { generateMRN, generateTokenId } from '@/lib/fhir/patient-mapper';

export const dynamic = 'force-dynamic';

interface BulkPatientData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  curp?: string;
  rfc?: string;
  gender?: string;
  bloodType?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { patients } = body as { patients: BulkPatientData[] };

      if (!Array.isArray(patients) || patients.length === 0) {
        return NextResponse.json(
          { error: 'Invalid request: patients array is required' },
          { status: 400 }
        );
      }

      // Validate batch size (max 100 patients per request)
      if (patients.length > 100) {
        return NextResponse.json(
          { error: 'Batch size too large. Maximum 100 patients per request.' },
          { status: 400 }
        );
      }

      const createdPatients = [];
      const errors = [];

      // Process each patient
      for (const patientData of patients) {
        try {
          // Generate required identifiers
          const mrn = generateMRN();
          const tokenId = generateTokenId();

          // Create patient record (automatically assigned to current clinician)
          const patient = await prisma.patient.create({
            data: {
              mrn,
              tokenId,
              firstName: patientData.firstName,
              lastName: patientData.lastName,
              email: patientData.email || null,
              phone: patientData.phone || null,
              dateOfBirth: new Date(patientData.dateOfBirth),
              gender: patientData.gender as any || null,
              address: patientData.street || null,
              city: patientData.city || null,
              state: patientData.state || null,
              postalCode: patientData.postalCode || null,
              country: 'México',
              assignedClinicianId: context.user.id, // Assign to importing clinician
            },
          });

          createdPatients.push(patient);
        } catch (error: any) {
          errors.push({
            patient: `${patientData.firstName} ${patientData.lastName}`,
            error: error.message,
          });
        }
      }

      return NextResponse.json(
        {
          success: true,
          created: createdPatients.length,
          failed: errors.length,
          patients: createdPatients,
          errors: errors.length > 0 ? errors : undefined,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Bulk patient import error:', error);
      return NextResponse.json(
        { error: 'Failed to import patients' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 3600000, maxRequests: 10 }, // 10 bulk imports per hour
    audit: { action: 'CREATE', resource: 'Patient' },
  }
);
