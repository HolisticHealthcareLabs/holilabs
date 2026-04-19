/**
 * Provider search orchestration.
 *
 * Strategy:
 * 1. Try Meilisearch first (typo-tolerant, faceted, fast)
 * 2. On any failure, fall back to Prisma (source of truth)
 *
 * Responses are normalized to the same shape regardless of backend, so the
 * API layer stays backend-agnostic.
 */
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  isMeilisearchAvailable,
  searchProvidersIndex,
  type ProviderSearchOptions,
} from './meilisearch';

export interface ProviderSearchResultItem {
  id: string;
  name: string;
  country: string;
  registryId: string;
  registryState: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  claimStatus: string;
  avgRating: number | null;
  reviewCount: number;
  bio: string | null;
  languages: string[];
  specialties: Array<{
    slug: string;
    displayPt: string;
    displayEs: string;
    displayEn: string;
    isCam: boolean;
    systemType: string;
    isPrimary: boolean;
  }>;
  establishments: Array<{
    name: string;
    type: string;
    city: string | null;
    state: string | null;
  }>;
  insurancePlans: Array<{
    slug: string;
    operator: string;
    plan: string | null;
  }>;
}

export interface ProviderSearchResult {
  items: ProviderSearchResultItem[];
  total: number;
  /** Informational — which backend served this request */
  backend: 'meilisearch' | 'prisma';
  processingTimeMs?: number;
}

export interface ProviderSearchQuery {
  q?: string;
  country?: string;
  state?: string;
  city?: string;
  specialty?: string;
  isCam?: boolean;
  systemType?: 'CONVENTIONAL' | 'INTEGRATIVE' | 'TRADITIONAL' | 'COMPLEMENTARY';
  insurancePlan?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: 'relevance' | 'rating' | 'name';
  page?: number;
  limit?: number;
}

export async function searchProviders(
  query: ProviderSearchQuery,
): Promise<ProviderSearchResult> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  if (await isMeilisearchAvailable()) {
    try {
      const result = await searchViaMeilisearch(query, offset, limit);
      return result;
    } catch (error) {
      logger.warn(
        { err: error, event: 'provider_search_meili_fallback' },
        'Meilisearch failed, falling back to Prisma',
      );
    }
  }

  return searchViaPrisma(query, offset, limit);
}

async function searchViaMeilisearch(
  query: ProviderSearchQuery,
  offset: number,
  limit: number,
): Promise<ProviderSearchResult> {
  const opts: ProviderSearchOptions = {
    query: query.q,
    country: query.country,
    state: query.state,
    city: query.city,
    specialtySlug: query.specialty,
    systemType: query.systemType,
    isCam: query.isCam,
    insurancePlanSlug: query.insurancePlan,
    lat: query.lat,
    lng: query.lng,
    radiusKm: query.radiusKm,
    sort: query.sort,
    limit,
    offset,
  };

  const meiliResult = await searchProvidersIndex(opts);

  // Hydrate with fresh joins from Prisma (index can be stale; ratings/reviews change)
  const ids = meiliResult.hits.map((h) => h.id);
  if (ids.length === 0) {
    return {
      items: [],
      total: meiliResult.estimatedTotalHits,
      backend: 'meilisearch',
      processingTimeMs: meiliResult.processingTimeMs,
    };
  }

  const providers = await prisma.physicianCatalog.findMany({
    where: { id: { in: ids } },
    include: providerIncludeShape(),
  });

  // Preserve Meilisearch ranking order
  const byId = new Map(providers.map((p) => [p.id, p]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map(toResultItem);

  return {
    items,
    total: meiliResult.estimatedTotalHits,
    backend: 'meilisearch',
    processingTimeMs: meiliResult.processingTimeMs,
  };
}

async function searchViaPrisma(
  query: ProviderSearchQuery,
  offset: number,
  limit: number,
): Promise<ProviderSearchResult> {
  const where: Record<string, unknown> = {
    isRegistryActive: true,
    publicProfileEnabled: true,
  };

  if (query.country) where.country = query.country;
  if (query.state) where.addressState = { contains: query.state, mode: 'insensitive' };
  if (query.city) where.addressCity = { contains: query.city, mode: 'insensitive' };
  if (query.q) where.name = { contains: query.q, mode: 'insensitive' };

  if (query.specialty || query.isCam !== undefined || query.systemType) {
    const specialtyFilter: Record<string, unknown> = {};
    if (query.specialty) specialtyFilter.specialty = { slug: query.specialty };
    if (query.isCam !== undefined || query.systemType) {
      const specWhere: Record<string, unknown> = {};
      if (query.isCam !== undefined) specWhere.isCam = query.isCam;
      if (query.systemType) specWhere.systemType = query.systemType;
      specialtyFilter.specialty = {
        ...((specialtyFilter.specialty as object) || {}),
        ...specWhere,
      };
    }
    where.specialties = { some: specialtyFilter };
  }

  if (query.insurancePlan) {
    where.insurancePlans = {
      some: { insurancePlan: { slug: query.insurancePlan }, isActive: true },
    };
  }

  const orderBy: Record<string, string>[] = [];
  if (query.sort === 'rating') orderBy.push({ avgRating: 'desc' });
  else if (query.sort === 'name') orderBy.push({ name: 'asc' });
  else orderBy.push({ completenessScore: 'desc' }, { avgRating: 'desc' });

  const started = Date.now();
  const [providers, total] = await Promise.all([
    prisma.physicianCatalog.findMany({
      where,
      include: providerIncludeShape(),
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.physicianCatalog.count({ where }),
  ]);

  return {
    items: providers.map(toResultItem),
    total,
    backend: 'prisma',
    processingTimeMs: Date.now() - started,
  };
}

function providerIncludeShape() {
  return {
    specialties: {
      include: {
        specialty: {
          select: {
            slug: true,
            displayPt: true,
            displayEs: true,
            displayEn: true,
            isCam: true,
            systemType: true,
          },
        },
      },
    },
    establishments: {
      include: {
        establishment: {
          select: { name: true, type: true, addressCity: true, addressState: true },
        },
      },
      take: 3,
    },
    insurancePlans: {
      where: { isActive: true },
      include: {
        insurancePlan: {
          select: { slug: true, operatorName: true, planName: true },
        },
      },
      take: 10,
    },
  } as const;
}

function toResultItem(p: any): ProviderSearchResultItem {
  return {
    id: p.id,
    name: p.name,
    country: p.country,
    registryId: p.registryId,
    registryState: p.registryState,
    photoUrl: p.photoUrl,
    city: p.addressCity,
    state: p.addressState,
    lat: p.lat ? Number(p.lat) : null,
    lng: p.lng ? Number(p.lng) : null,
    claimStatus: p.claimStatus,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    bio: p.bio,
    languages: p.languages,
    specialties: p.specialties.map((ps: any) => ({
      slug: ps.specialty.slug,
      displayPt: ps.specialty.displayPt,
      displayEs: ps.specialty.displayEs,
      displayEn: ps.specialty.displayEn,
      isCam: ps.specialty.isCam,
      systemType: ps.specialty.systemType,
      isPrimary: ps.isPrimary,
    })),
    establishments: p.establishments.map((pe: any) => ({
      name: pe.establishment.name,
      type: pe.establishment.type,
      city: pe.establishment.addressCity,
      state: pe.establishment.addressState,
    })),
    insurancePlans: p.insurancePlans.map((pip: any) => ({
      slug: pip.insurancePlan.slug,
      operator: pip.insurancePlan.operatorName,
      plan: pip.insurancePlan.planName,
    })),
  };
}
