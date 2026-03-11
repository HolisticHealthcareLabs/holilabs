/**
 * GCP Secret Manager Integration
 *
 * Drop-in replacement for aws-secrets.ts when running on Google Cloud.
 * Activated by setting SECRETS_PROVIDER=gcp in environment.
 *
 * On Cloud Run, authentication is automatic via the service account's
 * IAM binding to roles/secretmanager.secretAccessor.
 */

import { logger } from '@/lib/logger';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const SECRET_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedSecret {
  value: string;
  fetchedAt: number;
  version?: string;
}

const secretCache = new Map<string, CachedSecret>();

let SecretManagerServiceClient: any = null;
let smClient: any = null;

async function getClient() {
  if (smClient) return smClient;

  if (!SecretManagerServiceClient) {
    try {
      const mod = await import('@google-cloud/secret-manager');
      SecretManagerServiceClient = mod.SecretManagerServiceClient;
    } catch {
      throw new Error(
        '@google-cloud/secret-manager is not installed. ' +
        'Run: pnpm add @google-cloud/secret-manager'
      );
    }
  }

  smClient = new SecretManagerServiceClient();
  return smClient;
}

/**
 * Retrieve a secret from GCP Secret Manager.
 *
 * Secret names can be either:
 *   - Simple name: "DATABASE_URL" (resolved to projects/{id}/secrets/{name}/versions/latest)
 *   - Full resource name: "projects/holilabs-prod/secrets/DATABASE_URL/versions/3"
 */
export async function getSecret(
  secretName: string,
  version = 'latest',
  forceRefresh = false,
): Promise<string> {
  const cacheKey = `${secretName}:${version}`;

  if (!forceRefresh) {
    const cached = secretCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < SECRET_CACHE_TTL_MS) {
      return cached.value;
    }
  }

  const client = await getClient();

  const resourceName = secretName.startsWith('projects/')
    ? secretName
    : `projects/${GCP_PROJECT_ID}/secrets/${secretName}/versions/${version}`;

  try {
    const [response] = await client.accessSecretVersion({ name: resourceName });

    const payload = response.payload?.data;
    if (!payload) {
      throw new Error(`Secret ${secretName} has no payload`);
    }

    const secretValue = typeof payload === 'string'
      ? payload
      : Buffer.from(payload).toString('utf-8');

    secretCache.set(cacheKey, {
      value: secretValue,
      fetchedAt: Date.now(),
      version: response.name?.split('/').pop(),
    });

    logger.info({ secretName }, 'Fetched secret from GCP Secret Manager');
    return secretValue;
  } catch (error) {
    logger.error({ error, secretName }, 'Failed to retrieve secret from GCP Secret Manager');
    throw new Error(`Failed to retrieve secret ${secretName}: ${(error as Error).message}`);
  }
}

export async function getSecretJSON<T = Record<string, unknown>>(
  secretName: string,
  version?: string,
): Promise<T> {
  const raw = await getSecret(secretName, version);
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Secret ${secretName} is not valid JSON`);
  }
}

export async function getSecretsMulti(
  secretNames: string[],
): Promise<Record<string, string>> {
  const results = await Promise.all(
    secretNames.map(async (name) => ({ name, value: await getSecret(name) })),
  );
  return Object.fromEntries(results.map(({ name, value }) => [name, value]));
}

export function clearSecretCache(): void {
  secretCache.clear();
  logger.info('GCP Secret cache cleared');
}

/**
 * Encryption key retrieval compatible with encryption.ts
 */
export async function getEncryptionKey(
  version?: 'current' | 'previous',
): Promise<{ key: string; version: string }> {
  const secretName = version === 'previous'
    ? 'ENCRYPTION_KEY_PREVIOUS'
    : 'ENCRYPTION_KEY';

  const key = await getSecret(secretName);
  const cached = secretCache.get(`${secretName}:latest`);

  return { key, version: cached?.version || 'latest' };
}

export async function healthCheck(): Promise<boolean> {
  try {
    await getClient();
    logger.info('GCP Secret Manager health check passed');
    return true;
  } catch (error) {
    logger.error({ error }, 'GCP Secret Manager health check failed');
    return false;
  }
}
