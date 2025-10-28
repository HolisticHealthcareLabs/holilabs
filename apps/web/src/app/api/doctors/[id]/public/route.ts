import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/doctors/[id]/public
 * Get public profile of a doctor for booking
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get doctor with public information
    const doctor = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        specialty: true,
        licenseNumber: true,
        npi: true,
        credentials: {
          where: {
            verificationStatus: {
              in: ['VERIFIED', 'AUTO_VERIFIED'],
            },
          },
          select: {
            id: true,
            credentialType: true,
            credentialNumber: true,
            issuingAuthority: true,
            issuingCountry: true,
            issuedDate: true,
            expirationDate: true,
            verificationStatus: true,
            verifiedAt: true,
            verificationSource: true,
          },
        },
        providerAvailability: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isActive: true,
          },
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Calculate stats
    const verifiedCount = doctor.credentials.length;
    const hasAvailability = doctor.providerAvailability.length > 0;

    // Generate booking link
    const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${doctor.id}`;

    return NextResponse.json({
      success: true,
      doctor: {
        id: doctor.id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        npi: doctor.npi,
        isVerified: verifiedCount > 0,
        verifiedCredentials: verifiedCount,
        credentials: doctor.credentials,
        availability: doctor.providerAvailability,
        hasAvailability,
        bookingLink,
      },
    });
  } catch (error: any) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctor profile' },
      { status: 500 }
    );
  }
}
