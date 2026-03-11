import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/doctors/search
 * Search for doctors by location, specialty, name, etc.
 */
export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || '';
    const specialty = searchParams.get('specialty');
    const location = searchParams.get('location');
    const verified = searchParams.get('verified') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    const where: any = {
      role: { in: ['CLINICIAN', 'ADMIN'] },
    };

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (specialty) {
      where.specialty = { contains: specialty, mode: 'insensitive' };
    }

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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
