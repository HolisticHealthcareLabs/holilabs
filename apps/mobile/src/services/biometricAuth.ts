/**
 * Biometric Authentication Service
 *
 * Provides secure biometric authentication (Face ID, Touch ID, Fingerprint)
 * with fallback to device passcode. Stores credentials securely in device keychain.
 *
 * Features:
 * - Face ID / Touch ID / Fingerprint support
 * - Secure credential storage with SecureStore
 * - Automatic fallback to device passcode
 * - Biometric capability detection
 * - Haptic feedback on auth events
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// SecureStore keys
const SECURE_KEYS = {
  BIOMETRIC_ENABLED: 'biometric_auth_enabled',
  STORED_EMAIL: 'stored_email',
  STORED_PASSWORD: 'stored_password', // Encrypted by OS keychain
} as const;

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'unknown';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricType[];
}

/**
 * Get biometric authentication capabilities of the device
 */
export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypesRaw = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const supportedTypes: BiometricType[] = supportedTypesRaw.map((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'facial';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'iris';
        default:
          return 'unknown';
      }
    });

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes,
    };
  } catch (error) {
    console.error('Failed to get biometric capabilities:', error);
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
    };
  }
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(types: BiometricType[]): string {
  if (types.includes('facial')) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  if (types.includes('fingerprint')) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (types.includes('iris')) {
    return 'Iris Scan';
  }
  return 'Biometric Authentication';
}

/**
 * Check if biometric authentication is enabled by user
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to check biometric enabled status:', error);
    return false;
  }
}

/**
 * Enable biometric authentication and store credentials securely
 */
export async function enableBiometricAuth(email: string, password: string): Promise<boolean> {
  try {
    const capabilities = await getBiometricCapabilities();

    if (!capabilities.isAvailable) {
      throw new Error('Biometric authentication not available on this device');
    }

    // Store credentials in secure keychain (encrypted by OS)
    await SecureStore.setItemAsync(SECURE_KEYS.STORED_EMAIL, email, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    await SecureStore.setItemAsync(SECURE_KEYS.STORED_PASSWORD, password, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    await SecureStore.setItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED, 'true');

    // Success haptic
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    return true;
  } catch (error) {
    console.error('Failed to enable biometric auth:', error);

    // Error haptic
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    throw error;
  }
}

/**
 * Disable biometric authentication and clear stored credentials
 */
export async function disableBiometricAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.STORED_EMAIL);
    await SecureStore.deleteItemAsync(SECURE_KEYS.STORED_PASSWORD);
    await SecureStore.deleteItemAsync(SECURE_KEYS.BIOMETRIC_ENABLED);

    // Light haptic
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.error('Failed to disable biometric auth:', error);
    throw error;
  }
}

/**
 * Authenticate using biometrics and retrieve stored credentials
 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  email?: string;
  password?: string;
  error?: string;
}> {
  try {
    const capabilities = await getBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication not available',
      };
    }

    const biometricName = getBiometricTypeName(capabilities.supportedTypes);

    // Authenticate with biometrics
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in to Holi Labs`,
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false, // Allow passcode fallback
      cancelLabel: 'Cancel',
    });

    if (!result.success) {
      // Failure haptic
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }

    // Success haptic (subtle - authentication is quick)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Retrieve stored credentials
    const email = await SecureStore.getItemAsync(SECURE_KEYS.STORED_EMAIL);
    const password = await SecureStore.getItemAsync(SECURE_KEYS.STORED_PASSWORD);

    if (!email || !password) {
      return {
        success: false,
        error: 'Stored credentials not found',
      };
    }

    return {
      success: true,
      email,
      password,
    };
  } catch (error) {
    console.error('Biometric authentication error:', error);

    // Error haptic
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Get stored email without authentication (for display purposes)
 */
export async function getStoredEmail(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.STORED_EMAIL);
  } catch (error) {
    console.error('Failed to get stored email:', error);
    return null;
  }
}
