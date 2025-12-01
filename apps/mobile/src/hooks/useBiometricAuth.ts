/**
 * useBiometricAuth Hook
 *
 * React hook for managing biometric authentication in components.
 * Provides state management and easy-to-use functions for biometric auth.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getBiometricCapabilities,
  getBiometricTypeName,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  authenticateWithBiometrics,
  getStoredEmail,
  BiometricCapabilities,
  BiometricType,
} from '@/services/biometricAuth';

export interface UseBiometricAuthReturn {
  // Capabilities
  capabilities: BiometricCapabilities | null;
  biometricTypeName: string;
  isLoading: boolean;

  // State
  isEnabled: boolean;
  storedEmail: string | null;

  // Actions
  enable: (email: string, password: string) => Promise<boolean>;
  disable: () => Promise<void>;
  authenticate: () => Promise<{
    success: boolean;
    email?: string;
    password?: string;
    error?: string;
  }>;
  refresh: () => Promise<void>;
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load biometric capabilities and state
  const loadBiometricState = useCallback(async () => {
    setIsLoading(true);
    try {
      const [caps, enabled, email] = await Promise.all([
        getBiometricCapabilities(),
        isBiometricEnabled(),
        getStoredEmail(),
      ]);

      setCapabilities(caps);
      setIsEnabled(enabled);
      setStoredEmail(email);
    } catch (error) {
      console.error('Failed to load biometric state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadBiometricState();
  }, [loadBiometricState]);

  // Enable biometric auth
  const enable = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        await enableBiometricAuth(email, password);
        await loadBiometricState(); // Refresh state
        return true;
      } catch (error) {
        console.error('Failed to enable biometric auth:', error);
        return false;
      }
    },
    [loadBiometricState]
  );

  // Disable biometric auth
  const disable = useCallback(async (): Promise<void> => {
    try {
      await disableBiometricAuth();
      await loadBiometricState(); // Refresh state
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      throw error;
    }
  }, [loadBiometricState]);

  // Authenticate with biometrics
  const authenticate = useCallback(async () => {
    return await authenticateWithBiometrics();
  }, []);

  // Get biometric type name
  const biometricTypeName =
    capabilities && capabilities.supportedTypes.length > 0
      ? getBiometricTypeName(capabilities.supportedTypes)
      : 'Biometric Authentication';

  return {
    capabilities,
    biometricTypeName,
    isLoading,
    isEnabled,
    storedEmail,
    enable,
    disable,
    authenticate,
    refresh: loadBiometricState,
  };
}
