/**
 * Feature Flag Hook
 *
 * React hook for checking feature flags throughout the app
 * Uses PostHog feature flags with fallback to default values
 */

import { useState, useEffect } from 'react';
import { isFeatureEnabled, getFeatureFlagPayload } from '@/lib/posthog';
import { FeatureFlagKey, defaultFeatureFlags } from '@/lib/featureFlags';

/**
 * Check if a feature flag is enabled
 */
export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  const [isEnabled, setIsEnabled] = useState<boolean>(
    defaultFeatureFlags[flagKey] ?? false
  );

  useEffect(() => {
    // Get flag value from PostHog
    const enabled = isFeatureEnabled(flagKey);

    // If PostHog returns undefined, use default
    if (enabled !== undefined) {
      setIsEnabled(enabled);
    }
  }, [flagKey]);

  return isEnabled;
}

/**
 * Get feature flag payload (for multivariate flags)
 */
export function useFeatureFlagPayload<T = any>(flagKey: FeatureFlagKey): T | null {
  const [payload, setPayload] = useState<T | null>(null);

  useEffect(() => {
    const flagPayload = getFeatureFlagPayload(flagKey);
    if (flagPayload !== null) {
      setPayload(flagPayload);
    }
  }, [flagKey]);

  return payload;
}

/**
 * Check multiple feature flags at once
 */
export function useFeatureFlags(flagKeys: FeatureFlagKey[]): Record<FeatureFlagKey, boolean> {
  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    flagKeys.forEach(key => {
      initial[key] = defaultFeatureFlags[key] ?? false;
    });
    return initial;
  });

  useEffect(() => {
    const newFlags: Record<string, boolean> = {};
    flagKeys.forEach(key => {
      const enabled = isFeatureEnabled(key);
      newFlags[key] = enabled !== undefined ? enabled : (defaultFeatureFlags[key] ?? false);
    });
    setFlags(newFlags);
  }, [flagKeys]);

  return flags;
}
