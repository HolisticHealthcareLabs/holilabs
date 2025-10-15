/**
 * Analytics Hook
 *
 * Convenient hook for tracking events throughout the app
 * Automatically includes user context
 */

import { useCallback } from 'react';
import {
  trackEvent,
  trackPageView,
  identifyUser,
  resetUser,
  setUserProperties,
  isFeatureEnabled,
  getFeatureFlagPayload,
  AnalyticsEvents,
} from '@/lib/posthog';

export function useAnalytics() {
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, properties);
  }, []);

  const trackPage = useCallback((pageName?: string) => {
    trackPageView(pageName);
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    identifyUser(userId, traits);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  const setProperties = useCallback((properties: Record<string, any>) => {
    setUserProperties(properties);
  }, []);

  const isFeatureOn = useCallback((flagKey: string): boolean => {
    return isFeatureEnabled(flagKey);
  }, []);

  const getFeaturePayload = useCallback((flagKey: string): any => {
    return getFeatureFlagPayload(flagKey);
  }, []);

  return {
    track,
    trackPage,
    identify,
    reset,
    setProperties,
    isFeatureOn,
    getFeaturePayload,
    events: AnalyticsEvents,
  };
}
