/**
 * Bulk Patient Import API
 *
 * POST /api/patients/bulk - Create multiple patients at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        // Generate unique patient code
        const patientCode = `P${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create patient record
        const patient = await prisma.patient.create({
          data: {
            code: patientCode,
            firstName: patientData.firstName,
            lastName: patientData.lastName,
            email: patientData.email || null,
            phone: patientData.phone || null,
            dateOfBirth: new Date(patientData.dateOfBirth),
            curp: patientData.curp?.toUpperCase() || null,
            rfc: patientData.rfc?.toUpperCase() || null,
            gender: patientData.gender as any || null,
            bloodType: patientData.bloodType || null,
            address: patientData.street
              ? {
                  street: patientData.street,
                  city: patientData.city || '',
                  state: patientData.state || '',
                  postalCode: patientData.postalCode || '',
                  country: 'México',
                }
              : null,
            status: 'ACTIVE',
            createdBy: session.user.id,
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
}
