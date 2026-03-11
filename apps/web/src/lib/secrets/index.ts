/**
 * Secrets Provider Router
 *
 * Selects between AWS Secrets Manager and GCP Secret Manager based on
 * the SECRETS_PROVIDER environment variable.
 *
 * Default: "env" (read from process.env, no cloud SDK)
 * Options: "aws" | "gcp" | "env"
 */

export type SecretsProvider = 'aws' | 'gcp' | 'env';

const provider: SecretsProvider =
  (process.env.SECRETS_PROVIDER as SecretsProvider) || 'env';

export { provider as secretsProvider };

export async function getSecret(name: string): Promise<string> {
  if (provider === 'gcp') {
    const gcp = await import('./gcp-secrets');
    return gcp.getSecret(name);
  }

  if (provider === 'aws') {
    const aws = await import('./aws-secrets');
    return aws.getSecret(name);
  }

  const value = process.env[name];
  if (!value) {
    throw new Error(`Secret "${name}" not found in environment`);
  }
  return value;
}

export async function getEncryptionKey(
  version?: 'current' | 'previous',
): Promise<{ key: string; version: string }> {
  if (provider === 'gcp') {
    const gcp = await import('./gcp-secrets');
    return gcp.getEncryptionKey(version);
  }

  if (provider === 'aws') {
    const aws = await import('./aws-secrets');
    return aws.getEncryptionKey(version);
  }

  const envKey = version === 'previous'
    ? process.env.ENCRYPTION_KEY_PREVIOUS
    : process.env.ENCRYPTION_KEY;

  if (!envKey) {
    throw new Error(`ENCRYPTION_KEY${version === 'previous' ? '_PREVIOUS' : ''} not set`);
  }

  return { key: envKey, version: 'env' };
}

export async function healthCheck(): Promise<boolean> {
  if (provider === 'gcp') {
    const gcp = await import('./gcp-secrets');
    return gcp.healthCheck();
  }

  if (provider === 'aws') {
    const aws = await import('./aws-secrets');
    return aws.healthCheck();
  }

  return true;
}
