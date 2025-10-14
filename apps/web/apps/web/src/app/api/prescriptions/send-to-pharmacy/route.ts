/**
 * Send Prescription to Pharmacy API
 * Sends a prescription to a specific pharmacy
 *
 * POST /api/prescriptions/send-to-pharmacy
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SendToPharmacySchema = z.object({
  prescriptionId: z.string().cuid(),
  pharmacyId: z.string().cuid(),
  deliveryMethod: z.enum(['PICKUP', 'HOME_DELIVERY', 'CLINIC_DELIVERY']).default('PICKUP'),
  deliveryAddress: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const validated = SendToPharmacySchema.parse(body);

    // Check if prescription exists and belongs to clinician
    const prescription = await prisma.prescription.findUnique({
      where: { id: validated.prescriptionId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prescription not found',
        },
        { status: 404 }
      );
    }

    // Check if pharmacy exists
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: validated.pharmacyId },
    });

    if (!pharmacy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pharmacy not found',
        },
        { status: 404 }
      );
    }

    if (!pharmacy.isActive || !pharmacy.acceptsEPrescriptions) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pharmacy does not accept e-prescriptions',
        },
        { status: 400 }
      );
    }

    // Create pharmacy prescription record
    const pharmacyPrescription = await prisma.pharmacyPrescription.create({
      data: {
        prescriptionId: validated.prescriptionId,
        pharmacyId: validated.pharmacyId,
        status: 'SENT',
        deliveryMethod: validated.deliveryMethod,
        deliveryAddress: validated.deliveryAddress,
      },
      include: {
        pharmacy: true,
      },
    });

    // Update prescription status
    await prisma.prescription.update({
      where: { id: validated.prescriptionId },
      data: {
        sentToPharmacy: true,
        pharmacyId: validated.pharmacyId,
        status: 'SENT',
      },
    });

    // TODO: Send actual API request to pharmacy system
    // TODO: Send SMS notification to patient

    return NextResponse.json({
      success: true,
      data: {
        pharmacyPrescription,
        pharmacyName: pharmacy.name,
        pharmacyAddress: pharmacy.address,
      },
      message: 'Prescription sent to pharmacy successfully',
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'PharmacyPrescription' },
  }
);
