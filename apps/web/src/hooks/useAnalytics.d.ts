/**
 * Analytics Hook
 *
 * Convenient hook for tracking events throughout the app
 * Automatically includes user context
 */
export declare function useAnalytics(): {
    track: (eventName: string, properties?: Record<string, any>) => void;
    trackPage: (pageName?: string) => void;
    identify: (userId: string, traits?: Record<string, any>) => void;
    reset: () => void;
    setProperties: (properties: Record<string, any>) => void;
    isFeatureOn: (flagKey: string) => boolean;
    getFeaturePayload: (flagKey: string) => any;
    events: any;
};
//# sourceMappingURL=useAnalytics.d.ts.map