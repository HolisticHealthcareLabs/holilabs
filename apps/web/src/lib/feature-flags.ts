/**
 * Feature Flags System
 *
 * DB-backed feature flags with:
 * - 1-minute TTL cache for performance
 * - Clinic-specific overrides (clinic flag > global flag)
 * - Kill switch for AI features (critical for safety)
 *
 * Usage:
 *   const enabled = await isFeatureEnabled('ai.diagnosis.enabled', { clinicId });
 *   if (!enabled) return fallback;
 *
 * Flag naming convention:
 *   - ai.{feature}.enabled (e.g., ai.diagnosis.enabled)
 *   - feature.{name}.enabled (e.g., feature.prevention_hub.enabled)
 *
 * To disable AI for a specific clinic:
 *   INSERT INTO feature_flags (id, name, clinicId, enabled, updatedAt, reason)
 *   VALUES (gen_random_uuid(), 'ai.diagnosis.enabled', 'clinic_123', false, NOW(), 'Testing fallback');
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Cache structure: Map<cacheKey, { value: boolean, expiresAt: number }>
const FLAGS_CACHE = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Check if a feature flag is enabled
 *
 * Resolution order:
 * 1. Clinic-specific flag (if clinicId provided)
 * 2. Global flag (clinicId = null)
 * 3. Default to true (feature enabled if no flag exists)
 *
 * @param flagName - The flag name (e.g., 'ai.diagnosis.enabled')
 * @param context - Optional context with clinicId for clinic-specific flags
 * @returns true if enabled, false if disabled
 */
export async function isFeatureEnabled(
  flagName: string,
  context?: { clinicId?: string; userId?: string }
): Promise<boolean> {
  const clinicId = context?.clinicId;
  const cacheKey = `${flagName}:${clinicId || 'global'}`;

  // Check cache first
  const cached = FLAGS_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    // Query database: prefer clinic-specific, fall back to global
    const flags = await prisma.featureFlag.findMany({
      where: {
        name: flagName,
        OR: clinicId
          ? [{ clinicId }, { clinicId: null }]
          : [{ clinicId: null }],
      },
      orderBy: {
        // Clinic-specific flags first (non-null clinicId)
        clinicId: 'desc',
      },
      take: 1,
    });

    // Default to enabled if no flag exists
    const enabled = flags.length === 0 ? true : flags[0].enabled;

    // Cache the result
    FLAGS_CACHE.set(cacheKey, {
      value: enabled,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Log flag resolution (useful for debugging)
    if (!enabled) {
      logger.warn({
        event: 'feature_flag_disabled',
        flag: flagName,
        clinicId,
        source: flags.length > 0 ? (flags[0].clinicId ? 'clinic' : 'global') : 'default',
      });
    }

    return enabled;
  } catch (error) {
    // SECURITY FIX (H1): Fail-CLOSED for clinical/AI features
    // Non-clinical features can fail-open for usability
    const isClinicalFlag = flagName.startsWith('ai.') || flagName.startsWith('clinical.');
    const defaultValue = isClinicalFlag ? false : true;

    logger.error({
      event: 'feature_flag_check_error',
      flag: flagName,
      clinicId,
      error: error instanceof Error ? error.message : String(error),
      defaultingTo: defaultValue,
      failMode: isClinicalFlag ? 'CLOSED' : 'OPEN',
    });
    return defaultValue;
  }
}

/**
 * Check multiple feature flags at once (batched for efficiency)
 *
 * @param flagNames - Array of flag names to check
 * @param context - Optional context with clinicId
 * @returns Map of flagName -> enabled
 */
export async function areFeaturesEnabled(
  flagNames: string[],
  context?: { clinicId?: string }
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  // Check cache and collect uncached flags
  const uncachedFlags: string[] = [];
  for (const flagName of flagNames) {
    const cacheKey = `${flagName}:${context?.clinicId || 'global'}`;
    const cached = FLAGS_CACHE.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      results.set(flagName, cached.value);
    } else {
      uncachedFlags.push(flagName);
    }
  }

  // Query uncached flags in batch
  if (uncachedFlags.length > 0) {
    try {
      const flags = await prisma.featureFlag.findMany({
        where: {
          name: { in: uncachedFlags },
          OR: context?.clinicId
            ? [{ clinicId: context.clinicId }, { clinicId: null }]
            : [{ clinicId: null }],
        },
      });

      // Group by flag name, prefer clinic-specific
      const flagMap = new Map<string, boolean>();
      for (const flag of flags) {
        const existing = flagMap.get(flag.name);
        // Clinic-specific flags override global
        if (existing === undefined || flag.clinicId !== null) {
          flagMap.set(flag.name, flag.enabled);
        }
      }

      // Set results and cache
      for (const flagName of uncachedFlags) {
        const enabled = flagMap.get(flagName) ?? true; // Default to enabled
        results.set(flagName, enabled);

        const cacheKey = `${flagName}:${context?.clinicId || 'global'}`;
        FLAGS_CACHE.set(cacheKey, {
          value: enabled,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }
    } catch (error) {
      logger.error({
        event: 'batch_feature_flag_check_error',
        flags: uncachedFlags,
        error: error instanceof Error ? error.message : String(error),
      });

      // SECURITY FIX (H1): Fail-CLOSED for clinical/AI features
      for (const flagName of uncachedFlags) {
        const isClinicalFlag = flagName.startsWith('ai.') || flagName.startsWith('clinical.');
        results.set(flagName, isClinicalFlag ? false : true);
      }
    }
  }

  return results;
}

/**
 * Set a feature flag (admin function)
 *
 * @param flagName - The flag name
 * @param enabled - Whether the flag should be enabled
 * @param options - Optional clinicId for clinic-specific flag, userId for audit
 */
export async function setFeatureFlag(
  flagName: string,
  enabled: boolean,
  options?: {
    clinicId?: string;
    userId?: string;
    reason?: string;
    description?: string;
  }
): Promise<void> {
  const clinicId = options?.clinicId ?? null;

  // Handle null clinicId case separately since Prisma compound unique doesn't handle null well
  if (clinicId === null) {
    // For global flags (null clinicId), use findFirst + create/update pattern
    const existing = await prisma.featureFlag.findFirst({
      where: { name: flagName, clinicId: null },
    });

    if (existing) {
      await prisma.featureFlag.update({
        where: { id: existing.id },
        data: {
          enabled,
          createdBy: options?.userId,
          reason: options?.reason,
        },
      });
    } else {
      await prisma.featureFlag.create({
        data: {
          name: flagName,
          clinicId: null,
          enabled,
          description: options?.description,
          createdBy: options?.userId,
          reason: options?.reason,
        },
      });
    }
  } else {
    await prisma.featureFlag.upsert({
      where: {
        name_clinicId: {
          name: flagName,
          clinicId,
        },
      },
      create: {
        name: flagName,
        clinicId,
        enabled,
        description: options?.description,
        createdBy: options?.userId,
        reason: options?.reason,
      },
      update: {
        enabled,
        createdBy: options?.userId,
        reason: options?.reason,
      },
    });
  }

  // Invalidate cache for this flag
  const cacheKey = `${flagName}:${clinicId || 'global'}`;
  FLAGS_CACHE.delete(cacheKey);

  logger.info({
    event: 'feature_flag_updated',
    flag: flagName,
    clinicId,
    enabled,
    updatedBy: options?.userId,
    reason: options?.reason,
  });
}

/**
 * Clear the feature flag cache (useful for testing)
 */
export function clearFlagCache(): void {
  FLAGS_CACHE.clear();
}

/**
 * Get all feature flags (for admin dashboard)
 */
export async function getAllFeatureFlags(clinicId?: string): Promise<
  Array<{
    name: string;
    enabled: boolean;
    clinicId: string | null;
    description: string | null;
    reason: string | null;
    updatedAt: Date;
  }>
> {
  const flags = await prisma.featureFlag.findMany({
    where: clinicId
      ? { OR: [{ clinicId }, { clinicId: null }] }
      : undefined,
    orderBy: [{ name: 'asc' }, { clinicId: 'desc' }],
    select: {
      name: true,
      enabled: true,
      clinicId: true,
      description: true,
      reason: true,
      updatedAt: true,
    },
  });

  return flags;
}

// ============================================================================
// AI-SPECIFIC CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if AI diagnosis is enabled
 */
export async function isAIDiagnosisEnabled(clinicId?: string): Promise<boolean> {
  return isFeatureEnabled('ai.diagnosis.enabled', { clinicId });
}

/**
 * Check if AI scribe is enabled
 */
export async function isAIScribeEnabled(clinicId?: string): Promise<boolean> {
  return isFeatureEnabled('ai.scribe.enabled', { clinicId });
}

/**
 * Check if AI treatment protocol is enabled
 */
export async function isAITreatmentEnabled(clinicId?: string): Promise<boolean> {
  return isFeatureEnabled('ai.treatment.enabled', { clinicId });
}

/**
 * Check if AI adherence assessment is enabled
 */
export async function isAIAdherenceEnabled(clinicId?: string): Promise<boolean> {
  return isFeatureEnabled('ai.adherence.enabled', { clinicId });
}

/**
 * Check if LLM-as-Judge quality grading is enabled
 */
export async function isQualityGradingEnabled(clinicId?: string): Promise<boolean> {
  return isFeatureEnabled('ai.quality_grading.enabled', { clinicId });
}

/**
 * Disable all AI features for a clinic (emergency kill switch)
 */
export async function disableAllAIForClinic(
  clinicId: string,
  options?: { userId?: string; reason?: string }
): Promise<void> {
  const aiFlags = [
    'ai.diagnosis.enabled',
    'ai.scribe.enabled',
    'ai.treatment.enabled',
    'ai.adherence.enabled',
    'ai.quality_grading.enabled',
  ];

  for (const flag of aiFlags) {
    await setFeatureFlag(flag, false, {
      clinicId,
      userId: options?.userId,
      reason: options?.reason || 'Emergency AI kill switch activated',
    });
  }

  logger.warn({
    event: 'ai_kill_switch_activated',
    clinicId,
    flags: aiFlags,
    activatedBy: options?.userId,
    reason: options?.reason,
  });
}

/**
 * Re-enable all AI features for a clinic
 */
export async function enableAllAIForClinic(
  clinicId: string,
  options?: { userId?: string; reason?: string }
): Promise<void> {
  const aiFlags = [
    'ai.diagnosis.enabled',
    'ai.scribe.enabled',
    'ai.treatment.enabled',
    'ai.adherence.enabled',
    'ai.quality_grading.enabled',
  ];

  for (const flag of aiFlags) {
    await setFeatureFlag(flag, true, {
      clinicId,
      userId: options?.userId,
      reason: options?.reason || 'AI features re-enabled',
    });
  }

  logger.info({
    event: 'ai_features_reenabled',
    clinicId,
    flags: aiFlags,
    enabledBy: options?.userId,
    reason: options?.reason,
  });
}
