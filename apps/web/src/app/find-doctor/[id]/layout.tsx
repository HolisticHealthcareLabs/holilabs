import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.xyz';

interface ProviderForSeo {
  id: string;
  name: string;
  country: string;
  photoUrl: string | null;
  bio: string | null;
  addressCity: string | null;
  addressState: string | null;
  publicProfileEnabled: boolean;
  isRegistryActive: boolean;
  registryId: string;
  registryState: string | null;
  registrySource: string;
  avgRating: number;
  reviewCount: number;
  lat: { toString: () => string } | null;
  lng: { toString: () => string } | null;
  languages: string[];
  primarySpecialtyDisplayEn: string | null;
}

async function loadProviderForSeo(id: string): Promise<ProviderForSeo | null> {
  const provider = await prisma.physicianCatalog.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      country: true,
      photoUrl: true,
      bio: true,
      addressCity: true,
      addressState: true,
      publicProfileEnabled: true,
      isRegistryActive: true,
      registryId: true,
      registryState: true,
      registrySource: true,
      avgRating: true,
      reviewCount: true,
      lat: true,
      lng: true,
      languages: true,
      specialties: {
        where: { isPrimary: true },
        include: { specialty: { select: { displayEn: true } } },
        take: 1,
      },
    },
  });
  if (!provider || !provider.publicProfileEnabled || !provider.isRegistryActive) {
    return null;
  }
  return {
    ...provider,
    primarySpecialtyDisplayEn: provider.specialties[0]?.specialty.displayEn ?? null,
  };
}

/**
 * Server-side metadata for the provider detail page.
 *
 * The page.tsx under this layout is a client component — metadata and the
 * Physician JSON-LD both live at the layout boundary so search engines see
 * them in the initial HTML without executing JavaScript.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const url = `${BASE_URL}/find-doctor/${params.id}`;
  try {
    const provider = await loadProviderForSeo(params.id);
    if (!provider) {
      return {
        title: 'Provider not found — Holi Labs',
        robots: { index: false, follow: false },
        alternates: { canonical: url },
      };
    }

    const location = [provider.addressCity, provider.addressState].filter(Boolean).join(', ');
    const titleBase = provider.primarySpecialtyDisplayEn
      ? `${provider.name} — ${provider.primarySpecialtyDisplayEn}${location ? ` in ${location}` : ''}`
      : `${provider.name}${location ? ` — ${location}` : ''}`;

    const description =
      provider.bio && provider.bio.length > 0
        ? provider.bio.slice(0, 160)
        : `Book a consultation with ${provider.name}${
            provider.primarySpecialtyDisplayEn ? `, ${provider.primarySpecialtyDisplayEn}` : ''
          }${location ? ` in ${location}` : ''}. See reviews, insurance plans accepted, and practice locations on Holi Labs.`;

    return {
      title: `${titleBase} | Holi Labs`,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'profile',
        url,
        title: titleBase,
        description,
        siteName: 'Holi Labs',
        ...(provider.photoUrl ? { images: [{ url: provider.photoUrl }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: titleBase,
        description,
        ...(provider.photoUrl ? { images: [provider.photoUrl] } : {}),
      },
      other: {
        ...(provider.avgRating && Number(provider.avgRating) > 0
          ? {
              'rating:average': Number(provider.avgRating).toFixed(1),
              'rating:count': String(provider.reviewCount),
            }
          : {}),
      },
    };
  } catch {
    return {
      title: 'Provider — Holi Labs',
      alternates: { canonical: url },
    };
  }
}

export default async function ProviderDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const provider = await loadProviderForSeo(params.id).catch(() => null);

  const jsonLd = provider
    ? buildPhysicianJsonLd(provider, `${BASE_URL}/find-doctor/${provider.id}`)
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

function buildPhysicianJsonLd(provider: ProviderForSeo, url: string): Record<string, unknown> {
  const lat = provider.lat ? Number(provider.lat.toString()) : null;
  const lng = provider.lng ? Number(provider.lng.toString()) : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    '@id': url,
    name: provider.name,
    url,
    ...(provider.primarySpecialtyDisplayEn ? { medicalSpecialty: provider.primarySpecialtyDisplayEn } : {}),
    ...(provider.bio ? { description: provider.bio } : {}),
    ...(provider.photoUrl ? { image: provider.photoUrl } : {}),
    ...(provider.languages && provider.languages.length > 0 ? { knowsLanguage: provider.languages } : {}),
    ...(provider.avgRating && Number(provider.avgRating) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(provider.avgRating).toFixed(1),
            reviewCount: provider.reviewCount,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    ...(provider.addressCity || provider.addressState
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(provider.addressCity ? { addressLocality: provider.addressCity } : {}),
            ...(provider.addressState ? { addressRegion: provider.addressState } : {}),
            addressCountry: provider.country,
          },
        }
      : {}),
    ...(lat !== null && lng !== null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: lat,
            longitude: lng,
          },
        }
      : {}),
    identifier: {
      '@type': 'PropertyValue',
      propertyID: provider.registrySource,
      value: `${provider.registryId}${provider.registryState ? `/${provider.registryState}` : ''}`,
    },
  };
}
