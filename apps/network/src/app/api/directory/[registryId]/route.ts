/**
 * GET /api/directory/[registryId] — Individual physician profile
 *
 * Public endpoint. Returns full profile for a physician by their
 * internal `id` (CUID) or by `country:registryId:state` compound key.
 *
 * Query params:
 *   country      — required when looking up by registryId (e.g. "BR")
 *   state        — required for Brazil lookups (CRM is state-scoped)
 *
 * LGPD: Only returns publicProfileEnabled=true records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { registryId: string } }
): Promise<NextResponse> {
  const { registryId } = params;
  const { searchParams } = request.nextUrl;
  const country = searchParams.get('country')?.toUpperCase();
  const state = searchParams.get('state')?.toUpperCase();

  let physician: Awaited<ReturnType<typeof prisma.physicianCatalog.findFirst>>;

  if (registryId.startsWith('c') && registryId.length > 10) {
    // Lookup by CUID
    physician = await prisma.physicianCatalog.findFirst({
      where: { id: registryId, publicProfileEnabled: true },
      include: {
        specialties: {
          include: { specialty: true },
        },
        orgLinks: {
          where: { isActive: true },
          select: {
            orgId: true,
            calcomUsername: true,
            calcomEventSlug: true,
            acceptedPlans: true,
            claimedAt: true,
          },
        },
      },
    });
  } else if (country) {
    // Lookup by country + registryId + optional state
    physician = await prisma.physicianCatalog.findFirst({
      where: {
        country,
        registryId,
        ...(state ? { registryState: state } : {}),
        publicProfileEnabled: true,
      },
      include: {
        specialties: { include: { specialty: true } },
        orgLinks: {
          where: { isActive: true },
          select: { orgId: true, calcomUsername: true, calcomEventSlug: true, acceptedPlans: true, claimedAt: true },
        },
      },
    });
  } else {
    return NextResponse.json(
      { success: false, error: 'Provide either a CUID or a country + registryId' },
      { status: 400 }
    );
  }

  if (!physician) {
    return NextResponse.json({ success: false, error: 'Physician not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    physician: {
      id: physician.id,
      country: physician.country,
      registryId: physician.registryId,
      registryState: physician.registryState,
      registrySource: physician.registrySource,
      name: physician.name,
      photoUrl: physician.photoUrl,
      gender: physician.gender,
      lat: physician.lat !== null ? Number(physician.lat) : null,
      lng: physician.lng !== null ? Number(physician.lng) : null,
      city: physician.addressCity,
      state: physician.addressState,
      cep: physician.addressCep,
      street: physician.addressStreet,
      phone: physician.phone,
      email: physician.email,
      isRegistryActive: physician.isRegistryActive,
      completenessScore: physician.completenessScore,
      lastSyncedAt: physician.lastSyncedAt,
      specialties: (physician as NonNullable<typeof physician> & {
        specialties: Array<{ specialty: { slug: string; displayPt: string; displayEs: string; cfmCode: string | null }; rqeNumber: string | null; isPrimary: boolean }>;
      }).specialties.map((s) => ({
        slug: s.specialty.slug,
        namePt: s.specialty.displayPt,
        nameEs: s.specialty.displayEs,
        cfmCode: s.specialty.cfmCode,
        rqeNumber: s.rqeNumber,
        isPrimary: s.isPrimary,
      })),
      isInNetwork: (physician as NonNullable<typeof physician> & { orgLinks: unknown[] }).orgLinks.length > 0,
      networkLinks: (physician as NonNullable<typeof physician> & {
        orgLinks: Array<{ orgId: string; calcomUsername: string | null; calcomEventSlug: string | null; acceptedPlans: string[]; claimedAt: Date | null }>;
      }).orgLinks.map((l) => ({
        orgId: l.orgId,
        hasCalendar: !!(l.calcomUsername && l.calcomEventSlug),
        acceptedPlans: l.acceptedPlans,
        claimedAt: l.claimedAt,
      })),
    },
  });
}
