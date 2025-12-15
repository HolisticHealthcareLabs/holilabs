// Stub hook - Analytics removed (PostHog/Sentry removed)
// This file exists to prevent build errors from legacy imports

import { logger } from '@/lib/logger';

export function useAnalytics() {
  return {
    track: (event: string, properties?: Record<string, any>) => {
      // Analytics removed - no-op
      logger.debug({
        event: 'analytics_stub_track',
        analyticsEvent: event,
        properties
      });
    },
    identify: (userId: string, traits?: Record<string, any>) => {
      // Analytics removed - no-op
      logger.debug({
        event: 'analytics_stub_identify',
        userId,
        traits
      });
    },
  };
}

export default useAnalytics;
