/**
 * Feature Flag Hook
 *
 * React hook for checking feature flags throughout the app
 * Uses PostHog feature flags with fallback to default values
 */
import { FeatureFlagKey } from '@/lib/featureFlags';
/**
 * Check if a feature flag is enabled
 */
export declare function useFeatureFlag(flagKey: FeatureFlagKey): boolean;
/**
 * Get feature flag payload (for multivariate flags)
 */
export declare function useFeatureFlagPayload<T = any>(flagKey: FeatureFlagKey): T | null;
/**
 * Check multiple feature flags at once
 */
export declare function useFeatureFlags(flagKeys: FeatureFlagKey[]): Record<FeatureFlagKey, boolean>;
//# sourceMappingURL=useFeatureFlag.d.ts.map