import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/doctors/search
 * Search for doctors by location, specialty, name, etc.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Search parameters
    const query = searchParams.get('q') || '';
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    const verified = searchParams.get('verified') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      role: { in: ['CLINICIAN', 'ADMIN'] }, // Only show providers
    };

    // Text search (name or email)
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Specialty filter
    if (specialty) {
      where.specialty = { contains: specialty, mode: 'insensitive' };
    }

    // Location filter (would need to add location fields to User model)
    // For now, this is a placeholder

    // Get doctors with credentials
    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          specialty: true,
          licenseNumber: true,
          npi: true,
          credentials: {
            where: verified ? { verificationStatus: 'VERIFIED' } : undefined,
            select: {
              id: true,
              credentialType: true,
              verificationStatus: true,
              verifiedAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate verification status for each doctor
    const doctorsWithStats = doctors.map((doctor) => {
      const verifiedCount = doctor.credentials.filter(
        (c) => c.verificationStatus === 'VERIFIED' || c.verificationStatus === 'AUTO_VERIFIED'
      ).length;
      const totalCredentials = doctor.credentials.length;

      return {
        ...doctor,
        isVerified: verifiedCount > 0,
        verifiedCredentials: verifiedCount,
        totalCredentials,
        verificationPercentage:
          totalCredentials > 0 ? Math.round((verifiedCount / totalCredentials) * 100) : 0,
      };
    });

    // Filter by verified if requested
    const filteredDoctors = verified
      ? doctorsWithStats.filter((d) => d.isVerified)
      : doctorsWithStats;

    return NextResponse.json({
      success: true,
      doctors: filteredDoctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error searching doctors:', error);
    return NextResponse.json(
      { error: 'Failed to search doctors' },
      { status: 500 }
    );
  }
}
