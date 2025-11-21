/**
 * PostHog Integration
 *
 * Feature flag and analytics integration with PostHog
 * For now, uses local feature flags until PostHog is properly configured
 */

import { FeatureFlagKey, defaultFeatureFlags } from './featureFlags';

/**
 * Check if a feature flag is enabled
 *
 * @param flagKey - The feature flag key to check
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(flagKey: FeatureFlagKey): boolean {
  // TODO: Integrate with PostHog when ready
  // For now, use default feature flags
  return defaultFeatureFlags[flagKey] ?? false;
}

/**
 * Get feature flag payload
 *
 * @param flagKey - The feature flag key to get payload for
 * @returns The payload associated with the feature flag, or null if none
 */
export function getFeatureFlagPayload(flagKey: FeatureFlagKey): any {
  // TODO: Integrate with PostHog when ready
  // For now, return null as there are no payloads
  return null;
}
