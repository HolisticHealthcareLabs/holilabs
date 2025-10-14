/**
 * Pharmacies API
 * Manage pharmacy locations and integrations
 *
 * GET /api/pharmacies - List pharmacies with filters
 * POST /api/pharmacies - Create pharmacy location
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const CreatePharmacySchema = z.object({
  name: z.string().min(1),
  chain: z.enum([
    'GUADALAJARA',
    'BENAVIDES',
    'DEL_AHORRO',
    'SIMILARES',
    'SAN_PABLO',
    'ROMA',
    'YZA',
    'INDEPENDIENTE',
    'OTHER',
  ]),
  branchCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  isOpen24Hours: z.boolean().default(false),
  hasDelivery: z.boolean().default(false),
  acceptsEPrescriptions: z.boolean().default(true),
});

// ============================================================================
// POST /api/pharmacies - Create pharmacy
// ============================================================================

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const validated = CreatePharmacySchema.parse(body);

    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: validated.name,
        chain: validated.chain,
        branchCode: validated.branchCode,
        phone: validated.phone,
        email: validated.email,
        address: validated.address,
        city: validated.city,
        state: validated.state,
        postalCode: validated.postalCode,
        latitude: validated.latitude,
        longitude: validated.longitude,
        openingTime: validated.openingTime,
        closingTime: validated.closingTime,
        isOpen24Hours: validated.isOpen24Hours,
        hasDelivery: validated.hasDelivery,
        acceptsEPrescriptions: validated.acceptsEPrescriptions,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: pharmacy,
        message: 'Pharmacy created successfully',
      },
      { status: 201 }
    );
  },
  {
    roles: ['ADMIN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'CREATE', resource: 'Pharmacy' },
  }
);

// ============================================================================
// GET /api/pharmacies - List pharmacies
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const hasDelivery = searchParams.get('hasDelivery');

    const where: any = {
      isActive: true,
    };

    if (chain) where.chain = chain;
    if (city) where.city = city;
    if (state) where.state = state;
    if (hasDelivery) where.hasDelivery = hasDelivery === 'true';

    const pharmacies = await prisma.pharmacy.findMany({
      where,
      orderBy: [{ chain: 'asc' }, { name: 'asc' }],
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: pharmacies,
      count: pharmacies.length,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
  }
);
