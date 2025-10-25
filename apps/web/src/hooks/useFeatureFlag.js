"use strict";
/**
 * Feature Flag Hook
 *
 * React hook for checking feature flags throughout the app
 * Uses PostHog feature flags with fallback to default values
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeatureFlag = useFeatureFlag;
exports.useFeatureFlagPayload = useFeatureFlagPayload;
exports.useFeatureFlags = useFeatureFlags;
const react_1 = require("react");
const posthog_1 = require("@/lib/posthog");
const featureFlags_1 = require("@/lib/featureFlags");
/**
 * Check if a feature flag is enabled
 */
function useFeatureFlag(flagKey) {
    const [isEnabled, setIsEnabled] = (0, react_1.useState)(featureFlags_1.defaultFeatureFlags[flagKey] ?? false);
    (0, react_1.useEffect)(() => {
        // Get flag value from PostHog
        const enabled = (0, posthog_1.isFeatureEnabled)(flagKey);
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
function useFeatureFlagPayload(flagKey) {
    const [payload, setPayload] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const flagPayload = (0, posthog_1.getFeatureFlagPayload)(flagKey);
        if (flagPayload !== null) {
            setPayload(flagPayload);
        }
    }, [flagKey]);
    return payload;
}
/**
 * Check multiple feature flags at once
 */
function useFeatureFlags(flagKeys) {
    const [flags, setFlags] = (0, react_1.useState)(() => {
        const initial = {};
        flagKeys.forEach(key => {
            initial[key] = featureFlags_1.defaultFeatureFlags[key] ?? false;
        });
        return initial;
    });
    (0, react_1.useEffect)(() => {
        const newFlags = {};
        flagKeys.forEach(key => {
            const enabled = (0, posthog_1.isFeatureEnabled)(key);
            newFlags[key] = enabled !== undefined ? enabled : (featureFlags_1.defaultFeatureFlags[key] ?? false);
        });
        setFlags(newFlags);
    }, [flagKeys]);
    return flags;
}
//# sourceMappingURL=useFeatureFlag.js.map