/**
 * Analytics Service
 * Privacy-first analytics for clinical workflows
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import React from 'react';

/**
 * Event Categories
 */
export enum AnalyticsCategory {
  USER = 'user',
  CONSULTATION = 'consultation',
  PATIENT = 'patient',
  DIAGNOSIS = 'diagnosis',
  APPOINTMENT = 'appointment',
  SETTINGS = 'settings',
  ERROR = 'error',
  PERFORMANCE = 'performance',
}

/**
 * Analytics Event
 */
interface AnalyticsEvent {
  category: AnalyticsCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  deviceInfo: DeviceInfo;
}

/**
 * Device Information (anonymized)
 */
interface DeviceInfo {
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceType: string;
  manufacturer?: string;
}

/**
 * User Properties (non-PII)
 */
interface UserProperties {
  userRole?: 'doctor' | 'nurse' | 'admin';
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  notificationsEnabled?: boolean;
}

export class AnalyticsService {
  private static sessionId: string = '';
  private static userId?: string;
  private static userProperties: UserProperties = {};
  private static eventQueue: AnalyticsEvent[] = [];
  private static isEnabled: boolean = true;
  private static isInitialized: boolean = false;

  /**
   * Initialize analytics service
   */
  static async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    // Generate session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;

    // Load user preferences
    const analyticsEnabled = await AsyncStorage.getItem('analytics_enabled');
    this.isEnabled = analyticsEnabled !== 'false'; // Opt-out by default

    // Load queued events from storage
    await this.loadQueuedEvents();

    this.isInitialized = true;

    // Track app open
    this.trackEvent({
      category: AnalyticsCategory.USER,
      action: 'app_open',
      metadata: {
        isFirstLaunch: await this.isFirstLaunch(),
      },
    });

    console.log('Analytics initialized:', {
      sessionId: this.sessionId,
      enabled: this.isEnabled,
    });
  }

  /**
   * Track event
   * IMPORTANT: Never log PHI (Protected Health Information)
   */
  static trackEvent(params: {
    category: AnalyticsCategory;
    action: string;
    label?: string;
    value?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      ...params,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.getDeviceInfo(),
    };

    // Add to queue
    this.eventQueue.push(event);

    // Log in development
    if (__DEV__) {
      console.log('Analytics Event:', {
        category: event.category,
        action: event.action,
        label: event.label,
        metadata: event.metadata,
      });
    }

    // Flush queue if it gets large
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * Track screen view
   */
  static trackScreenView(screenName: string, metadata?: Record<string, any>): void {
    this.trackEvent({
      category: AnalyticsCategory.USER,
      action: 'screen_view',
      label: screenName,
      metadata,
    });
  }

  /**
   * Track consultation event
   * NOTE: NO patient names, MRNs, or PHI
   */
  static trackConsultation(action: 'start' | 'pause' | 'resume' | 'stop' | 'save'): void {
    this.trackEvent({
      category: AnalyticsCategory.CONSULTATION,
      action: `consultation_${action}`,
    });
  }

  /**
   * Track diagnosis event
   * NOTE: NO specific diagnoses, only categories
   */
  static trackDiagnosis(action: 'view' | 'search' | 'select', metadata?: Record<string, any>): void {
    this.trackEvent({
      category: AnalyticsCategory.DIAGNOSIS,
      action: `diagnosis_${action}`,
      metadata,
    });
  }

  /**
   * Track appointment event
   * NOTE: NO patient information
   */
  static trackAppointment(action: 'create' | 'view' | 'update' | 'cancel'): void {
    this.trackEvent({
      category: AnalyticsCategory.APPOINTMENT,
      action: `appointment_${action}`,
    });
  }

  /**
   * Track error (for monitoring)
   */
  static trackError(error: Error, metadata?: Record<string, any>): void {
    this.trackEvent({
      category: AnalyticsCategory.ERROR,
      action: 'error_occurred',
      label: error.name,
      metadata: {
        message: error.message,
        stack: error.stack?.substring(0, 500), // Truncate stack trace
        ...metadata,
      },
    });
  }

  /**
   * Track performance metric
   */
  static trackPerformance(metric: string, durationMs: number, metadata?: Record<string, any>): void {
    this.trackEvent({
      category: AnalyticsCategory.PERFORMANCE,
      action: 'performance_metric',
      label: metric,
      value: durationMs,
      metadata,
    });
  }

  /**
   * Set user properties (non-PII only)
   */
  static setUserProperties(properties: UserProperties): void {
    this.userProperties = {
      ...this.userProperties,
      ...properties,
    };

    if (__DEV__) {
      console.log('User Properties Updated:', this.userProperties);
    }
  }

  /**
   * Set user ID (when user logs in)
   */
  static setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Enable/disable analytics
   */
  static async setAnalyticsEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem('analytics_enabled', enabled.toString());

    this.trackEvent({
      category: AnalyticsCategory.SETTINGS,
      action: 'analytics_toggled',
      metadata: { enabled },
    });

    if (!enabled) {
      // Clear queued events if user opts out
      this.eventQueue = [];
      await AsyncStorage.removeItem('analytics_queue');
    }
  }

  /**
   * Flush events to backend
   */
  static async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // TODO: Send to your analytics backend
      // const response = await fetch('https://api.holilabs.com/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     events: eventsToSend,
      //     userProperties: this.userProperties,
      //   }),
      // });

      // For now, just log in development
      if (__DEV__) {
        console.log(`Flushed ${eventsToSend.length} analytics events`);
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToSend);
      await this.saveQueuedEvents();
    }
  }

  /**
   * Get device info (anonymized)
   */
  private static getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: Constants.expoConfig?.version || '1.0.0',
      deviceType: Device.deviceType ? this.getDeviceTypeName(Device.deviceType) : 'unknown',
      manufacturer: Device.manufacturer || undefined,
    };
  }

  /**
   * Get device type name
   */
  private static getDeviceTypeName(type: number): string {
    const types: Record<number, string> = {
      0: 'unknown',
      1: 'phone',
      2: 'tablet',
      3: 'desktop',
      4: 'tv',
    };
    return types[type] || 'unknown';
  }

  /**
   * Check if this is first launch
   */
  private static async isFirstLaunch(): Promise<boolean> {
    const hasLaunched = await AsyncStorage.getItem('has_launched');
    if (!hasLaunched) {
      await AsyncStorage.setItem('has_launched', 'true');
      return true;
    }
    return false;
  }

  /**
   * Load queued events from storage
   */
  private static async loadQueuedEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('analytics_queue');
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load queued events:', error);
    }
  }

  /**
   * Save queued events to storage
   */
  private static async saveQueuedEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem('analytics_queue', JSON.stringify(this.eventQueue));
    } catch (error) {
      console.error('Failed to save queued events:', error);
    }
  }

  /**
   * Get analytics summary (for debugging)
   */
  static getAnalyticsSummary(): {
    sessionId: string;
    userId?: string;
    queuedEvents: number;
    isEnabled: boolean;
  } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      queuedEvents: this.eventQueue.length,
      isEnabled: this.isEnabled,
    };
  }
}

/**
 * Higher-order component for screen tracking
 */
export const withScreenTracking = (ScreenComponent: React.ComponentType<any>, screenName: string) => {
  return (props: any) => {
    React.useEffect(() => {
      AnalyticsService.trackScreenView(screenName);
    }, []);

    return <ScreenComponent {...props} />;
  };
};
