import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.xyz';
const MAX_PROVIDER_URLS = 50_000 - 10; // leave headroom for static routes

/**
 * Public sitemap for search engines.
 *
 * Includes:
 *   - Home + key static routes
 *   - Every public provider detail page (publicProfileEnabled + isRegistryActive)
 *
 * Next.js regenerates this automatically per the `revalidate` export.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/find-doctor`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/legal/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/legal/terms-of-service`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let providerRoutes: MetadataRoute.Sitemap = [];
  try {
    const providers = await prisma.physicianCatalog.findMany({
      where: {
        publicProfileEnabled: true,
        isRegistryActive: true,
      },
      select: { id: true, updatedAt: true, claimStatus: true, completenessScore: true },
      orderBy: [{ completenessScore: 'desc' }, { updatedAt: 'desc' }],
      take: MAX_PROVIDER_URLS,
    });

    providerRoutes = providers.map((p) => ({
      url: `${BASE_URL}/find-doctor/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      // Verified profiles rank higher. Completeness nudges within each tier.
      priority: p.claimStatus === 'VERIFIED'
        ? Math.min(0.9, 0.7 + (p.completenessScore / 1000))
        : Math.min(0.7, 0.5 + (p.completenessScore / 1000)),
    }));
  } catch {
    // If DB is unreachable at build/regen time, serve the static portion only.
    providerRoutes = [];
  }

  return [...staticRoutes, ...providerRoutes];
}

// Revalidate the sitemap hourly so new providers appear in search within the hour.
export const revalidate = 3600;
