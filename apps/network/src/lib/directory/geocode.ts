/**
 * Geocoding utilities for the physician directory import pipeline.
 *
 * Strategy (free, no API key required):
 *   1. ViaCEP  — converts CEP (Brazilian postal code) → city/state
 *   2. Nominatim (OSM) — converts address string → lat/lng
 *
 * Rate limiting: Nominatim usage policy requires max 1 req/sec.
 * The pipeline enforces this via the sleep() helper.
 *
 * For production scale: swap Nominatim with Google Maps Geocoding API
 * by setting GOOGLE_MAPS_API_KEY env var.
 */

export interface GeoResult {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  cep?: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Geocode a Brazilian address string to lat/lng via Nominatim (OSM).
 * Falls back to null if the address cannot be resolved.
 * Rate limit: call sleep(1100) between requests in batch pipelines.
 */
export async function geocodeAddress(
  addressLine: string,
  city: string,
  state: string,
  country = 'Brazil'
): Promise<GeoResult | null> {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  if (googleKey) {
    return geocodeGoogle(addressLine, city, state, country, googleKey);
  }

  return geocodeNominatim(addressLine, city, state, country);
}

async function geocodeNominatim(
  addressLine: string,
  city: string,
  state: string,
  country: string
): Promise<GeoResult | null> {
  const q = encodeURIComponent(`${addressLine}, ${city}, ${state}, ${country}`);
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${q}&format=json&limit=1&addressdetails=1`,
      {
        headers: { 'User-Agent': 'HoliNetwork/1.0 (holi.health)' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data?.[0]) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      city,
      state,
    };
  } catch {
    return null;
  }
}

async function geocodeGoogle(
  addressLine: string,
  city: string,
  state: string,
  country: string,
  apiKey: string
): Promise<GeoResult | null> {
  const address = encodeURIComponent(`${addressLine}, ${city}, ${state}, ${country}`);
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng, city, state };
  } catch {
    return null;
  }
}

/**
 * Look up a Brazilian CEP (postal code) via ViaCEP — free, no API key.
 * Returns city/state/street enrichment for an address.
 */
export async function lookupCep(cep: string): Promise<{
  city: string;
  state: string;
  street?: string;
} | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      erro?: boolean;
      localidade?: string;
      uf?: string;
      logradouro?: string;
    };
    if (data.erro) return null;
    return {
      city: data.localidade ?? '',
      state: data.uf ?? '',
      street: data.logradouro,
    };
  } catch {
    return null;
  }
}
