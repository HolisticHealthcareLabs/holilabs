/**
 * Services Index
 * Central export for all mobile app services
 */

// Biometric Authentication
export {
  getBiometricCapabilities,
  getBiometricTypeName,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  authenticateWithBiometrics,
  getStoredEmail,
  type BiometricType,
  type BiometricCapabilities,
} from './biometricAuth';

// Haptic Feedback
export {
  HapticFeedback,
  lightHaptic,
  mediumHaptic,
  heavyHaptic,
  successHaptic,
  warningHaptic,
  errorHaptic,
  selectionHaptic,
  refreshHaptic,
  swipeActionHaptic,
  longPressHaptic,
  vitalRecordedHaptic,
  appointmentConfirmedHaptic,
  prescriptionSentHaptic,
  recordingToggleHaptic,
  urgentAlertHaptic,
  debouncedHaptic,
} from './haptics';

// Analytics Service
export { default as analyticsService } from './analyticsService';

// Notification Service
export { default as notificationService } from './notificationService';
