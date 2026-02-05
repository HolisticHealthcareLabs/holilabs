// @ts-nocheck
import type { Patient, Encounter, Bundle } from '@medplum/fhirtypes';

/**
 * Lightweight Medplum client built on the public FHIR + OAuth2 endpoints.
 * Avoids pulling Fastify/Prisma context directly so the service can be used
 * from cron jobs, queue workers, or API routes.
 */

const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'http://localhost:8100';
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID;
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;
const MEDPLUM_PROJECT_ID = process.env.MEDPLUM_PROJECT_ID || 'default';

type AccessTokenCache = { token: string; expiresAt: number } | null;
let cachedToken: AccessTokenCache = null;

export interface PatientSyncPayload {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  identifierSystem?: string;
  identifierValue?: string;
  address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface EncounterSyncPayload {
  id: string;
  patientId: string;
  status: Encounter['status'];
  type?: Encounter['type'];
  reasonCode?: Encounter['reasonCode'];
  start?: string;
  end?: string;
  locationDisplay?: string;
}

function isMedplumConfigured(): boolean {
  return Boolean(MEDPLUM_CLIENT_ID && MEDPLUM_CLIENT_SECRET && MEDPLUM_BASE_URL);
}

async function getAccessToken(): Promise<string | null> {
  if (!isMedplumConfigured()) {
    console.warn('[FHIR] Medplum env vars missing, skipping sync');
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60 * 1000) {
    return cachedToken.token;
  }

  const tokenUrl = new URL('/oauth2/token', MEDPLUM_BASE_URL).toString();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: MEDPLUM_CLIENT_ID!,
    client_secret: MEDPLUM_CLIENT_SECRET!,
    scope: `project/${MEDPLUM_PROJECT_ID}./*`,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch Medplum token: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function upsertResource<T extends { resourceType: string; id?: string }>(
  resourceType: T['resourceType'],
  resource: T
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  if (!resource.id) {
    throw new Error(`[FHIR] ${resourceType} resource is missing an id`);
  }

  const url = new URL(`/fhir/R4/${resourceType}/${resource.id}`, MEDPLUM_BASE_URL).toString();
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
    },
    body: JSON.stringify(resource),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`[FHIR] Failed to upsert ${resourceType}/${resource.id}: ${detail}`);
  }
}

export async function syncPatientToFhir(payload: PatientSyncPayload): Promise<void> {
  const patient: Patient = {
    resourceType: 'Patient',
    id: payload.id,
    name: [
      {
        use: 'official',
        family: payload.lastName,
        given: [payload.firstName],
      },
    ],
    telecom: [
      ...(payload.email ? [{ system: 'email', value: payload.email }] : []),
      ...(payload.phone ? [{ system: 'phone', value: payload.phone }] : []),
    ],
    gender: payload.gender,
    birthDate: payload.birthDate ?? undefined,
    identifier:
      payload.identifierSystem && payload.identifierValue
        ? [
          {
            system: payload.identifierSystem,
            value: payload.identifierValue,
          },
        ]
        : undefined,
    address: payload.address
      ? [
        {
          line: payload.address.line,
          city: payload.address.city,
          state: payload.address.state,
          postalCode: payload.address.postalCode,
          country: payload.address.country,
        },
      ]
      : undefined,
  };

  await upsertResource('Patient', patient);
}

export async function syncEncounterToFhir(payload: EncounterSyncPayload): Promise<void> {
  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: payload.id,
    status: payload.status,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
    },
    subject: {
      reference: `Patient/${payload.patientId}`,
    },
    type: payload.type,
    reasonCode: payload.reasonCode,
    period:
      payload.start || payload.end
        ? {
          start: payload.start,
          end: payload.end,
        }
        : undefined,
    location: payload.locationDisplay
      ? [
        {
          location: {
            display: payload.locationDisplay,
          },
        },
      ]
      : undefined,
  };

  await upsertResource('Encounter', encounter);
}

export async function fetchPatientEverything(patientId: string): Promise<Bundle | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const url = new URL(`/fhir/R4/Patient/${patientId}/$everything`, MEDPLUM_BASE_URL).toString();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`[FHIR] Failed to fetch bundle for Patient/${patientId}: ${detail}`);
  }

  return (await response.json()) as Bundle;
}
