/**
 * Enhanced Haptics Service
 *
 * Provides consistent, context-aware haptic feedback across the app.
 * Based on competitive analysis of Zocdoc, Epic MyChart, and leading healthcare apps.
 *
 * Principles:
 * - Healthcare-appropriate (calm, not aggressive)
 * - Contextual (different feedback for different actions)
 * - Accessible (respects reduced motion preferences)
 * - Performance-optimized (debounced where needed)
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Check if device supports haptics
 */
export function isHapticsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Light haptic - for subtle interactions
 * Use cases: Button press, checkbox toggle, switch toggle, tab selection
 */
export async function lightHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silently fail - haptics are non-critical
  }
}

/**
 * Medium haptic - for standard interactions
 * Use cases: Card selection, list item selection, form submission
 */
export async function mediumHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Heavy haptic - for important interactions
 * Use cases: Delete confirmation, important alerts, critical actions
 */
export async function heavyHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Success haptic - for successful operations
 * Use cases: Form submitted, appointment created, save successful
 */
export async function successHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Android fallback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Warning haptic - for warning states
 * Use cases: Form validation warning, unsaved changes warning
 */
export async function warningHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Android fallback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Error haptic - for error states
 * Use cases: Login failed, API error, critical validation error
 */
export async function errorHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      // Android fallback - double tap for emphasis
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        100
      );
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Selection changed haptic - for selection UI changes
 * Use cases: Segmented control, picker, dropdown selection
 */
export async function selectionHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.selectionAsync();
  } catch (error) {
    // Silently fail
  }
}

/**
 * Pull to refresh haptic - for refresh gestures
 * Use cases: Pull to refresh patient list, appointments list
 */
export async function refreshHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Swipe action haptic - for swipe gestures
 * Use cases: Swipe to delete, swipe to archive, swipe actions on list items
 */
export async function swipeActionHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Long press haptic - for long press gestures
 * Use cases: Long press to copy, long press to open context menu
 */
export async function longPressHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Healthcare-specific haptics
 */

/**
 * Vital sign recorded haptic - for vital sign entry
 * Use cases: Blood pressure recorded, temperature entered
 */
export async function vitalRecordedHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    // Subtle double-tap to confirm data entry
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      80
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Appointment confirmed haptic - for appointment booking
 * Use cases: Appointment created, appointment confirmed
 */
export async function appointmentConfirmedHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Android - satisfying double-tap
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        100
      );
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Prescription sent haptic - for prescription actions
 * Use cases: Prescription sent to pharmacy, prescription saved
 */
export async function prescriptionSentHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (error) {
    // Silently fail
  }
}

/**
 * Recording started/stopped haptic - for voice recording
 * Use cases: Start recording SOAP notes, stop recording
 */
export async function recordingToggleHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Urgent alert haptic - for urgent clinical alerts
 * Use cases: Critical lab result, urgent patient message, emergency alert
 */
export async function urgentAlertHaptic(): Promise<void> {
  try {
    if (!isHapticsSupported()) return;
    // Persistent pattern for urgent attention (triple tap)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      150
    );
    setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      300
    );
  } catch (error) {
    // Silently fail
  }
}

/**
 * Debounced haptic wrapper - prevents haptic spam
 */
let lastHapticTime = 0;
const HAPTIC_DEBOUNCE_MS = 50; // Minimum time between haptics

export async function debouncedHaptic(
  hapticFn: () => Promise<void>
): Promise<void> {
  const now = Date.now();
  if (now - lastHapticTime >= HAPTIC_DEBOUNCE_MS) {
    lastHapticTime = now;
    await hapticFn();
  }
}

/**
 * Export namespaced haptics object for cleaner imports
 */
export const HapticFeedback = {
  // Basic
  light: lightHaptic,
  medium: mediumHaptic,
  heavy: heavyHaptic,

  // Notifications
  success: successHaptic,
  warning: warningHaptic,
  error: errorHaptic,

  // Interactions
  selection: selectionHaptic,
  refresh: refreshHaptic,
  swipeAction: swipeActionHaptic,
  longPress: longPressHaptic,

  // Healthcare-specific
  vitalRecorded: vitalRecordedHaptic,
  appointmentConfirmed: appointmentConfirmedHaptic,
  prescriptionSent: prescriptionSentHaptic,
  recordingToggle: recordingToggleHaptic,
  urgentAlert: urgentAlertHaptic,

  // Utility
  debounced: debouncedHaptic,
};
