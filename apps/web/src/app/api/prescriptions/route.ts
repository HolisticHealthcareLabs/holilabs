/**
 * Prescription API - Create Prescription
 *
 * POST /api/prescriptions - Create new prescription with blockchain hash
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * POST /api/prescriptions
 * Create new prescription with e-signature
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['patientId', 'clinicianId', 'medications', 'signatureMethod', 'signatureData'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate prescription hash for blockchain
    const prescriptionData = {
      patientId: body.patientId,
      clinicianId: body.clinicianId,
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
        clinicianId: body.clinicianId,
        prescriptionHash,
        medications: body.medications,
        instructions: body.instructions || '',
        diagnoses: body.diagnoses || '',
        notes: body.notes || '',
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        signatureMethod: body.signatureMethod,
        signatureData: body.signatureData,
        signedAt: new Date(),
        status: 'ACTIVE',
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
          prescribedBy: body.clinicianId,
          prescriptionHash,
        },
      });
    });

    await Promise.all(medicationPromises);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: body.clinicianId,
        userEmail: 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'Prescription',
        resourceId: prescription.id,
        details: { 
          medicationCount: body.medications.length,
          prescriptionHash 
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
}

/**
 * GET /api/prescriptions?patientId=xxx
 * Get prescriptions for a patient
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
        { status: 400 }
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
}
