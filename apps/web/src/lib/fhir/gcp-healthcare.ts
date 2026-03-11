/**
 * Google Cloud Healthcare API — FHIR R4 Client
 *
 * Replaces self-hosted Medplum for production FHIR operations.
 * Provides a managed, HIPAA/LGPD-compliant FHIR store.
 *
 * Activated by setting FHIR_PROVIDER=gcp in environment.
 * Falls back to Medplum when FHIR_PROVIDER=medplum (default).
 *
 * Prerequisites:
 *   1. Cloud Healthcare API enabled
 *   2. Dataset created in southamerica-east1
 *   3. FHIR store created with R4 version
 *   4. Service account has roles/healthcare.fhirResourceEditor
 */

import logger from '@/lib/logger';

const GCP_PROJECT = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';
const GCP_LOCATION = process.env.GCP_HEALTHCARE_LOCATION || 'southamerica-east1';
const DATASET_ID = process.env.GCP_HEALTHCARE_DATASET || 'holilabs-clinical';
const FHIR_STORE_ID = process.env.GCP_FHIR_STORE || 'holilabs-fhir-r4';

const FHIR_BASE = `https://healthcare.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

let authClient: any = null;

async function getAuthToken(): Promise<string> {
  if (!authClient) {
    const { GoogleAuth } = await import('google-auth-library');
    authClient = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-healthcare'],
    });
  }

  const client = await authClient.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Failed to get GCP access token');
  return token;
}

async function fhirRequest(
  path: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
): Promise<any> {
  const token = await getAuthToken();
  const url = `${FHIR_BASE}/${path}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error, path }, 'GCP FHIR request failed');
    throw new Error(`FHIR ${options.method || 'GET'} ${path} failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a FHIR resource.
 */
export async function createResource(
  resourceType: string,
  resource: any,
): Promise<any> {
  logger.info({ resourceType }, 'Creating FHIR resource');
  return fhirRequest(resourceType, {
    method: 'POST',
    body: { ...resource, resourceType },
  });
}

/**
 * Read a FHIR resource by ID.
 */
export async function readResource(
  resourceType: string,
  id: string,
): Promise<any> {
  return fhirRequest(`${resourceType}/${id}`);
}

/**
 * Update a FHIR resource.
 */
export async function updateResource(
  resourceType: string,
  id: string,
  resource: any,
): Promise<any> {
  logger.info({ resourceType, id }, 'Updating FHIR resource');
  return fhirRequest(`${resourceType}/${id}`, {
    method: 'PUT',
    body: { ...resource, resourceType, id },
  });
}

/**
 * Search for FHIR resources.
 */
export async function searchResources(
  resourceType: string,
  params: Record<string, string>,
): Promise<any> {
  const query = new URLSearchParams(params).toString();
  return fhirRequest(`${resourceType}?${query}`);
}

/**
 * Delete a FHIR resource (soft delete in Healthcare API).
 */
export async function deleteResource(
  resourceType: string,
  id: string,
): Promise<void> {
  logger.info({ resourceType, id }, 'Deleting FHIR resource');
  await fhirRequest(`${resourceType}/${id}`, { method: 'DELETE' });
}

/**
 * Execute a FHIR Bundle transaction.
 */
export async function executeBundle(bundle: any): Promise<any> {
  logger.info({ entryCount: bundle.entry?.length }, 'Executing FHIR Bundle');
  return fhirRequest('', {
    method: 'POST',
    body: bundle,
  });
}

/**
 * Export all data for a specific patient (FHIR $everything).
 */
export async function patientEverything(patientId: string): Promise<any> {
  return fhirRequest(`Patient/${patientId}/$everything`);
}

/**
 * Health check for FHIR store connectivity.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await fhirRequest('metadata');
    logger.info('GCP Healthcare FHIR store health check passed');
    return true;
  } catch (error) {
    logger.error({ error }, 'GCP Healthcare FHIR store health check failed');
    return false;
  }
}

/**
 * Setup script for creating the Healthcare API dataset and FHIR store.
 * Run once during Phase 4 setup.
 */
export function getSetupCommands(): string[] {
  return [
    `gcloud healthcare datasets create ${DATASET_ID} --location=${GCP_LOCATION}`,
    `gcloud healthcare fhir-stores create ${FHIR_STORE_ID} --dataset=${DATASET_ID} --location=${GCP_LOCATION} --version=R4`,
    `gcloud healthcare fhir-stores update ${FHIR_STORE_ID} --dataset=${DATASET_ID} --location=${GCP_LOCATION} --enable-update-create`,
  ];
}
