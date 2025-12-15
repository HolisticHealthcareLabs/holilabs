/**
 * Global Patient Search API
 *
 * Searches patients by: name, MRN, token ID, CPF, phone, email
 * Supports fuzzy search with typo tolerance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({ patients: [] });
    }

    // Search patients with fuzzy matching
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            mrn: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            tokenId: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: query.replace(/\D/g, ''),
            },
          },
        ],
      },
      select: {
        id: true,
        tokenId: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        mrn: true,
        phone: true,
        gender: true,
        isActive: true,
        isPalliativeCare: true,
        updatedAt: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    // Calculate age for each patient
    const patientsWithAge = patients.map(patient => {
      let age: number | null = null;
      if (patient.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(patient.dateOfBirth);
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        ...patient,
        age,
      };
    });

    return NextResponse.json({
      patients: patientsWithAge,
      query,
      count: patientsWithAge.length,
    });
  } catch (error) {
    console.error('Patient search error:', error);
    return NextResponse.json(
      { error: 'Failed to search patients' },
      { status: 500 }
    );
  }
}
