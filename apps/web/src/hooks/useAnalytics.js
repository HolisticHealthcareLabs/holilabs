"use strict";
/**
 * Analytics Hook
 *
 * Convenient hook for tracking events throughout the app
 * Automatically includes user context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAnalytics = useAnalytics;
const react_1 = require("react");
const posthog_1 = require("@/lib/posthog");
function useAnalytics() {
    const track = (0, react_1.useCallback)((eventName, properties) => {
        (0, posthog_1.trackEvent)(eventName, properties);
    }, []);
    const trackPage = (0, react_1.useCallback)((pageName) => {
        (0, posthog_1.trackPageView)(pageName);
    }, []);
    const identify = (0, react_1.useCallback)((userId, traits) => {
        (0, posthog_1.identifyUser)(userId, traits);
    }, []);
    const reset = (0, react_1.useCallback)(() => {
        (0, posthog_1.resetUser)();
    }, []);
    const setProperties = (0, react_1.useCallback)((properties) => {
        (0, posthog_1.setUserProperties)(properties);
    }, []);
    const isFeatureOn = (0, react_1.useCallback)((flagKey) => {
        return (0, posthog_1.isFeatureEnabled)(flagKey);
    }, []);
    const getFeaturePayload = (0, react_1.useCallback)((flagKey) => {
        return (0, posthog_1.getFeatureFlagPayload)(flagKey);
    }, []);
    return {
        track,
        trackPage,
        identify,
        reset,
        setProperties,
        isFeatureOn,
        getFeaturePayload,
        events: posthog_1.AnalyticsEvents,
    };
}
//# sourceMappingURL=useAnalytics.js.map