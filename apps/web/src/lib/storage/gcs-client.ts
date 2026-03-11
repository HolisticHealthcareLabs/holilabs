/**
 * Google Cloud Storage Client
 *
 * S3-compatible adapter for Google Cloud Storage.
 * Activated by setting STORAGE_PROVIDER=gcs in environment.
 *
 * On Cloud Run, authentication is automatic via the service account's
 * IAM binding to roles/storage.objectUser.
 *
 * Bucket must be in southamerica-east1 for LGPD data residency.
 */

import logger from '../logger';

const GCS_BUCKET = process.env.GCS_BUCKET || 'holilabs-uploads';
const GCS_PROJECT = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

let storageClient: any = null;

async function getStorage() {
  if (storageClient) return storageClient;

  try {
    const { Storage } = await import('@google-cloud/storage');
    storageClient = new Storage({ projectId: GCS_PROJECT });
    return storageClient;
  } catch {
    throw new Error(
      '@google-cloud/storage is not installed. Run: pnpm add @google-cloud/storage'
    );
  }
}

export interface GCSUploadOptions {
  contentType: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export async function uploadToGCS(
  key: string,
  data: Buffer,
  options: GCSUploadOptions,
): Promise<{ url: string; bucket: string; key: string }> {
  const storage = await getStorage();
  const bucket = storage.bucket(GCS_BUCKET);
  const file = bucket.file(key);

  await file.save(data, {
    contentType: options.contentType,
    metadata: {
      metadata: options.metadata || {},
    },
    resumable: data.length > 5 * 1024 * 1024,
  });

  if (options.isPublic) {
    await file.makePublic();
  }

  logger.info({ bucket: GCS_BUCKET, key }, 'Uploaded to GCS');

  return {
    url: `https://storage.googleapis.com/${GCS_BUCKET}/${key}`,
    bucket: GCS_BUCKET,
    key,
  };
}

export async function downloadFromGCS(key: string): Promise<Buffer> {
  const storage = await getStorage();
  const [data] = await storage.bucket(GCS_BUCKET).file(key).download();
  return data;
}

export async function deleteFromGCS(key: string): Promise<void> {
  const storage = await getStorage();
  await storage.bucket(GCS_BUCKET).file(key).delete();
  logger.info({ bucket: GCS_BUCKET, key }, 'Deleted from GCS');
}

export async function getSignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const storage = await getStorage();
  const [url] = await storage
    .bucket(GCS_BUCKET)
    .file(key)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    });
  return url;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const storage = await getStorage();
    await storage.bucket(GCS_BUCKET).getMetadata();
    return true;
  } catch (error) {
    logger.error({ error }, 'GCS health check failed');
    return false;
  }
}
