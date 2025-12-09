/**
 * Secret Rotation Utilities
 *
 * SOC 2 Control: CC6.8 (Encryption Key Management & Rotation)
 *
 * This module provides utilities for rotating secrets in AWS Secrets Manager
 * with zero-downtime blue-green deployment pattern:
 *
 * 1. Create new secret version (AWSCURRENT moves to new version)
 * 2. Application loads both AWSCURRENT (new) and AWSPREVIOUS (old)
 * 3. New encryptions use AWSCURRENT
 * 4. Old data still decrypts with AWSPREVIOUS
 * 5. After migration window, AWSPREVIOUS can be deleted
 *
 * Rotation Schedule (SOC 2 Best Practice):
 * - Encryption keys: Every 90 days
 * - Session secrets: Every 30 days
 * - API keys: On compromise or annually
 */

import {
  SecretsManagerClient,
  UpdateSecretCommand,
  PutSecretValueCommand,
  DescribeSecretCommand,
  type DescribeSecretCommandOutput,
} from '@aws-sdk/client-secrets-manager';
import { logger } from '@/lib/logger';
import { clearSecretCache } from './aws-secrets';
import { clearKeyCache, setCurrentKeyVersion } from '@/lib/security/encryption';
import { generateEncryptionKey } from '@/lib/security/encryption';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

let secretsManagerClient: SecretsManagerClient | null = null;

function getSecretsManagerClient(): SecretsManagerClient {
  if (!secretsManagerClient) {
    secretsManagerClient = new SecretsManagerClient({ region: AWS_REGION });
  }
  return secretsManagerClient;
}

/**
 * Rotation status for tracking
 */
export interface RotationStatus {
  secretName: string;
  previousVersion?: string;
  currentVersion: string;
  rotatedAt: Date;
  rotationWindowEnds?: Date;
}

/**
 * Rotate an encryption key in AWS Secrets Manager
 *
 * This implements blue-green key rotation:
 * 1. Generates new encryption key
 * 2. Stores as new version (becomes AWSCURRENT)
 * 3. Previous version becomes AWSPREVIOUS
 * 4. Application can decrypt with both keys during migration
 *
 * @param secretName - Name of the secret to rotate
 * @param rotationWindowDays - Days to keep old key (default: 30)
 * @returns Rotation status
 *
 * @example
 * ```typescript
 * const status = await rotateEncryptionKey('prod/holi/encryption-key', 30);
 * console.log(`Rotated to version: ${status.currentVersion}`);
 * ```
 */
export async function rotateEncryptionKey(
  secretName: string,
  rotationWindowDays: number = 30
): Promise<RotationStatus> {
  try {
    logger.info({ secretName, rotationWindowDays }, 'Starting encryption key rotation');

    const client = getSecretsManagerClient();

    // Step 1: Get current secret version
    const describeCommand = new DescribeSecretCommand({ SecretId: secretName });
    const currentSecret: DescribeSecretCommandOutput = await client.send(describeCommand);

    const previousVersion = currentSecret.VersionIdsToStages
      ? Object.keys(currentSecret.VersionIdsToStages).find(
          (versionId) => currentSecret.VersionIdsToStages![versionId].includes('AWSCURRENT')
        )
      : undefined;

    // Step 2: Generate new encryption key (32 bytes = 64 hex characters)
    const newKey = generateEncryptionKey();

    logger.info({ secretName }, 'Generated new encryption key');

    // Step 3: Create new secret version (this automatically stages it as AWSCURRENT)
    const putCommand = new PutSecretValueCommand({
      SecretId: secretName,
      SecretString: newKey,
    });

    const putResponse = await client.send(putCommand);

    logger.info(
      {
        secretName,
        newVersion: putResponse.VersionId,
        previousVersion,
      },
      'Successfully rotated encryption key'
    );

    // Step 4: Clear all caches to force reload
    clearSecretCache();
    clearKeyCache();

    // Step 5: Increment key version for new encryptions
    // Note: You'll need to track this in your application state
    // For now, we'll use version 2 after first rotation
    setCurrentKeyVersion(2);

    const rotatedAt = new Date();
    const rotationWindowEnds = new Date();
    rotationWindowEnds.setDate(rotationWindowEnds.getDate() + rotationWindowDays);

    return {
      secretName,
      previousVersion,
      currentVersion: putResponse.VersionId!,
      rotatedAt,
      rotationWindowEnds,
    };
  } catch (error) {
    logger.error({ error, secretName }, 'Failed to rotate encryption key');
    throw new Error(`Failed to rotate encryption key ${secretName}: ${(error as Error).message}`);
  }
}

/**
 * Rotate a simple secret (session secret, API key, etc.)
 *
 * @param secretName - Name of the secret to rotate
 * @param newValue - New secret value
 * @returns Rotation status
 *
 * @example
 * ```typescript
 * const newSessionSecret = crypto.randomBytes(32).toString('hex');
 * await rotateSecret('prod/holi/session-secret', newSessionSecret);
 * ```
 */
export async function rotateSecret(
  secretName: string,
  newValue: string
): Promise<RotationStatus> {
  try {
    logger.info({ secretName }, 'Starting secret rotation');

    const client = getSecretsManagerClient();

    // Get current version for tracking
    const describeCommand = new DescribeSecretCommand({ SecretId: secretName });
    const currentSecret = await client.send(describeCommand);

    const previousVersion = currentSecret.VersionIdsToStages
      ? Object.keys(currentSecret.VersionIdsToStages).find(
          (versionId) => currentSecret.VersionIdsToStages![versionId].includes('AWSCURRENT')
        )
      : undefined;

    // Create new version
    const putCommand = new PutSecretValueCommand({
      SecretId: secretName,
      SecretString: newValue,
    });

    const putResponse = await client.send(putCommand);

    logger.info(
      {
        secretName,
        newVersion: putResponse.VersionId,
        previousVersion,
      },
      'Successfully rotated secret'
    );

    // Clear cache to force reload
    clearSecretCache();

    return {
      secretName,
      previousVersion,
      currentVersion: putResponse.VersionId!,
      rotatedAt: new Date(),
    };
  } catch (error) {
    logger.error({ error, secretName }, 'Failed to rotate secret');
    throw new Error(`Failed to rotate secret ${secretName}: ${(error as Error).message}`);
  }
}

/**
 * Get rotation schedule for all secrets
 * Returns when each secret was last rotated and when it's due for rotation
 *
 * @param secretNames - Array of secret names to check
 * @returns Rotation schedule information
 *
 * @example
 * ```typescript
 * const schedule = await getRotationSchedule([
 *   'prod/holi/encryption-key',
 *   'prod/holi/session-secret',
 * ]);
 *
 * schedule.forEach(item => {
 *   console.log(`${item.secretName}: ${item.daysSinceRotation} days since rotation`);
 * });
 * ```
 */
export async function getRotationSchedule(secretNames: string[]): Promise<
  Array<{
    secretName: string;
    lastRotated?: Date;
    daysSinceRotation?: number;
    recommendedRotationDays: number;
    isDue: boolean;
  }>
> {
  const client = getSecretsManagerClient();

  const schedulePromises = secretNames.map(async (secretName) => {
    try {
      const describeCommand = new DescribeSecretCommand({ SecretId: secretName});
      const secret = await client.send(describeCommand);

      const lastRotated = secret.LastRotatedDate;
      const daysSinceRotation = lastRotated
        ? Math.floor((Date.now() - lastRotated.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // Determine recommended rotation period based on secret type
      const recommendedRotationDays = secretName.includes('encryption-key')
        ? 90 // Encryption keys: 90 days
        : secretName.includes('session')
        ? 30 // Session secrets: 30 days
        : 365; // Other secrets: annually

      const isDue = daysSinceRotation !== undefined && daysSinceRotation >= recommendedRotationDays;

      return {
        secretName,
        lastRotated,
        daysSinceRotation,
        recommendedRotationDays,
        isDue,
      };
    } catch (error) {
      logger.error({ error, secretName }, 'Failed to get rotation schedule for secret');
      return {
        secretName,
        lastRotated: undefined,
        daysSinceRotation: undefined,
        recommendedRotationDays: 365,
        isDue: false,
      };
    }
  });

  return Promise.all(schedulePromises);
}

/**
 * Automated rotation check and execution
 * Call this from a scheduled job (e.g., Lambda, cron)
 *
 * @param secretPrefix - Prefix for secrets to check (e.g., 'prod/holi')
 * @param dryRun - If true, only log what would be rotated without executing
 * @returns List of rotated secrets
 *
 * @example
 * ```typescript
 * // In a Lambda function or cron job
 * const rotated = await performScheduledRotation('prod/holi', false);
 * console.log(`Rotated ${rotated.length} secrets`);
 * ```
 */
export async function performScheduledRotation(
  secretPrefix: string,
  dryRun: boolean = true
): Promise<RotationStatus[]> {
  const secretNames = [
    `${secretPrefix}/encryption-key`,
    `${secretPrefix}/session-secret`,
    `${secretPrefix}/nextauth-secret`,
  ];

  logger.info({ secretPrefix, dryRun, secretNames }, 'Checking secrets for rotation');

  const schedule = await getRotationSchedule(secretNames);
  const dueForRotation = schedule.filter((item) => item.isDue);

  if (dueForRotation.length === 0) {
    logger.info('No secrets due for rotation');
    return [];
  }

  logger.info(
    { dueSecrets: dueForRotation.map((s) => s.secretName) },
    `${dueForRotation.length} secrets due for rotation`
  );

  if (dryRun) {
    logger.warn('DRY RUN: Would rotate the following secrets:');
    dueForRotation.forEach((secret) => {
      logger.warn({
        secretName: secret.secretName,
        daysSinceRotation: secret.daysSinceRotation,
      });
    });
    return [];
  }

  // Perform actual rotation
  const rotationResults: RotationStatus[] = [];

  for (const secret of dueForRotation) {
    try {
      let status: RotationStatus;

      if (secret.secretName.includes('encryption-key')) {
        status = await rotateEncryptionKey(secret.secretName, 30);
      } else {
        // For session secrets, generate new random value
        const crypto = await import('crypto');
        const newValue = crypto.randomBytes(32).toString('hex');
        status = await rotateSecret(secret.secretName, newValue);
      }

      rotationResults.push(status);
    } catch (error) {
      logger.error({ error, secretName: secret.secretName }, 'Failed to rotate secret');
    }
  }

  logger.info({ rotatedCount: rotationResults.length }, 'Completed scheduled rotation');

  return rotationResults;
}

/**
 * Verify rotation completed successfully
 * Checks that both AWSCURRENT and AWSPREVIOUS versions exist
 *
 * @param secretName - Secret to verify
 * @returns Verification result
 */
export async function verifyRotation(secretName: string): Promise<{
  success: boolean;
  currentVersion?: string;
  previousVersion?: string;
  message: string;
}> {
  try {
    const client = getSecretsManagerClient();
    const describeCommand = new DescribeSecretCommand({ SecretId: secretName });
    const secret = await client.send(describeCommand);

    const versions = secret.VersionIdsToStages || {};

    const currentVersion = Object.keys(versions).find((v) =>
      versions[v].includes('AWSCURRENT')
    );

    const previousVersion = Object.keys(versions).find((v) =>
      versions[v].includes('AWSPREVIOUS')
    );

    if (!currentVersion) {
      return {
        success: false,
        message: 'No AWSCURRENT version found',
      };
    }

    if (!previousVersion) {
      return {
        success: true,
        currentVersion,
        message: 'Rotation successful (no previous version - first rotation)',
      };
    }

    return {
      success: true,
      currentVersion,
      previousVersion,
      message: 'Rotation successful - both current and previous versions available',
    };
  } catch (error) {
    logger.error({ error, secretName }, 'Failed to verify rotation');
    return {
      success: false,
      message: `Verification failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Emergency key rotation
 * Use when a key is compromised
 * Forces immediate rotation with shorter migration window (7 days)
 *
 * @param secretName - Secret to rotate immediately
 * @returns Rotation status
 */
export async function emergencyRotation(secretName: string): Promise<RotationStatus> {
  logger.warn({ secretName }, '🚨 EMERGENCY ROTATION INITIATED');

  const status = secretName.includes('encryption-key')
    ? await rotateEncryptionKey(secretName, 7) // Short 7-day window for emergency
    : await rotateSecret(
        secretName,
        (await import('crypto')).randomBytes(32).toString('hex')
      );

  logger.warn(
    {
      secretName,
      newVersion: status.currentVersion,
      rotationWindowEnds: status.rotationWindowEnds,
    },
    '🚨 EMERGENCY ROTATION COMPLETED'
  );

  // TODO: Send alert to security team
  // await sendSecurityAlert({
  //   type: 'EMERGENCY_KEY_ROTATION',
  //   secretName,
  //   rotatedAt: status.rotatedAt,
  // });

  return status;
}
