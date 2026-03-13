/**
 * GET /api/directory/search — Public physician directory search
 *
 * Unauthenticated. No PHI. Returns only public registry data.
 *
 * Query params:
 *   q        — name search (trigram fuzzy match)
 *   specialty — MedicalSpecialty slug (e.g. "cardiologia")
 *   country  — "BR" | "AR" | "UY" | "PY" (default: all)
 *   state    — state/province code (e.g. "SP")
 *   city     — city name (case-insensitive)
 *   lat      — latitude (required for radius search)
 *   lng      — longitude (required for radius search)
 *   radius   — search radius in km (default: 10, max: 100)
 *   plans    — comma-separated insurance plan slugs (via NetworkProviderLink)
 *   inNetwork — "true" = only doctors in a Holi network (have NetworkProviderLink)
 *   page     — page number (default: 1)
 *   limit    — results per page (default: 20, max: 100)
 *
 * LGPD: Only publicProfileEnabled=true records returned.
 * No auth required — this is the public directory surface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createLogger } from '@/lib/logger';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_RADIUS_KM = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const log = createLogger({ service: 'api/directory/search' });
  const { searchParams } = request.nextUrl;

  const q         = searchParams.get('q')?.trim() ?? '';
  const specialty = searchParams.get('specialty')?.trim();
  const country   = searchParams.get('country')?.toUpperCase().trim();
  const state     = searchParams.get('state')?.toUpperCase().trim();
  const city      = searchParams.get('city')?.trim();
  const lat       = parseFloat(searchParams.get('lat') ?? '');
  const lng       = parseFloat(searchParams.get('lng') ?? '');
  const radius    = Math.min(parseFloat(searchParams.get('radius') ?? '10'), MAX_RADIUS_KM);
  const inNetwork = searchParams.get('inNetwork') === 'true';
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit     = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)));
  const offset    = (page - 1) * limit;

  // Build where clause
  type WhereClause = {
    publicProfileEnabled: boolean;
    isRegistryActive: boolean;
    country?: string;
    addressState?: { contains: string; mode: 'insensitive' };
    addressCity?: { contains: string; mode: 'insensitive' };
    name?: { contains: string; mode: 'insensitive' };
    specialties?: {
      some: { specialty: { slug: string } }
    };
    orgLinks?: { some: { isActive: boolean } };
    AND?: Array<{
      lat?: { gte: number; lte: number };
      lng?: { gte: number; lte: number };
    }>;
  };

  const where: WhereClause = {
    publicProfileEnabled: true,
    isRegistryActive: true,
  };

  if (country) where.country = country;
  if (state) where.addressState = { contains: state, mode: 'insensitive' };
  if (city) where.addressCity = { contains: city, mode: 'insensitive' };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (specialty) where.specialties = { some: { specialty: { slug: specialty } } };
  if (inNetwork) where.orgLinks = { some: { isActive: true } };

  // Bounding box pre-filter for radius search (PostGIS not available in all deployments)
  // A 1-degree of latitude ≈ 111km; 1-degree longitude ≈ 111km * cos(lat)
  if (!isNaN(lat) && !isNaN(lng)) {
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));
    where.AND = [
      { lat: { gte: lat - latDelta, lte: lat + latDelta } },
      { lng: { gte: lng - lngDelta, lte: lng + lngDelta } },
    ];
  }

  try {
    const [physicians, total] = await Promise.all([
      prisma.physicianCatalog.findMany({
        where,
        include: {
          specialties: {
            include: { specialty: { select: { slug: true, displayPt: true, displayEs: true } } },
            where: { isPrimary: true },
            take: 3,
          },
          orgLinks: {
            where: { isActive: true },
            select: { orgId: true, calcomUsername: true, calcomEventSlug: true, acceptedPlans: true },
          },
        },
        orderBy: [
          { completenessScore: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.physicianCatalog.count({ where }),
    ]);

    // If radius search: post-filter by actual Haversine distance
    const results = (!isNaN(lat) && !isNaN(lng))
      ? physicians.filter((p) => {
          if (!p.lat || !p.lng) return false;
          const d = haversineKm(lat, lng, Number(p.lat), Number(p.lng));
          return d <= radius;
        })
      : physicians;

    log.info({ q, specialty, country, state, total, returned: results.length }, 'Directory search');

    return NextResponse.json({
      success: true,
      physicians: results.map(formatPhysician),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    log.error({ err: String(err) }, 'Directory search failed');
    return NextResponse.json({ success: false, error: 'Search unavailable' }, { status: 503 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type PhysicianWithIncludes = Awaited<ReturnType<typeof prisma.physicianCatalog.findMany<{
  include: {
    specialties: { include: { specialty: { select: { slug: true; displayPt: true; displayEs: true } } }; where: { isPrimary: boolean }; take: number };
    orgLinks: { where: { isActive: boolean }; select: { orgId: true; calcomUsername: true; calcomEventSlug: true; acceptedPlans: true } };
  };
}>>>[number];

function formatPhysician(p: PhysicianWithIncludes) {
  return {
    id: p.id,
    country: p.country,
    registryId: p.registryId,
    registryState: p.registryState,
    name: p.name,
    photoUrl: p.photoUrl,
    gender: p.gender,
    lat: p.lat !== null ? Number(p.lat) : null,
    lng: p.lng !== null ? Number(p.lng) : null,
    city: p.addressCity,
    state: p.addressState,
    phone: p.phone,
    specialties: p.specialties.map((s) => ({
      slug: s.specialty.slug,
      namePt: s.specialty.displayPt,
      nameEs: s.specialty.displayEs,
      rqeNumber: s.rqeNumber,
    })),
    isInNetwork: p.orgLinks.length > 0,
    networkLinks: p.orgLinks.map((l) => ({
      orgId: l.orgId,
      hasCalendar: !!(l.calcomUsername && l.calcomEventSlug),
      acceptedPlans: l.acceptedPlans,
    })),
    completenessScore: p.completenessScore,
  };
}
