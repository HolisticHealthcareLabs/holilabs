// Stub hook - Analytics removed (PostHog/Sentry removed)
// This file exists to prevent build errors from legacy imports

export function useAnalytics() {
  return {
    track: (event: string, properties?: Record<string, any>) => {
      // Analytics removed - no-op
      console.log('[Analytics removed]', event, properties);
    },
    identify: (userId: string, traits?: Record<string, any>) => {
      // Analytics removed - no-op
      console.log('[Analytics removed] identify:', userId, traits);
    },
  };
}

export default useAnalytics;
