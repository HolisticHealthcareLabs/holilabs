import { MMKV } from 'react-native-mmkv';

// MMKV provides fast, encrypted local storage
export const storage = new MMKV({
  id: 'holi-labs-storage',
  encryptionKey: 'holi-labs-encryption-key-2025', // In production, use a secure key from keychain
});

// Helper functions for common operations
export const storageHelpers = {
  // Get JSON object
  getObject: <T>(key: string): T | null => {
    const json = storage.getString(key);
    return json ? JSON.parse(json) : null;
  },

  // Set JSON object
  setObject: (key: string, value: any): void => {
    storage.set(key, JSON.stringify(value));
  },

  // Get array
  getArray: <T>(key: string): T[] => {
    const json = storage.getString(key);
    return json ? JSON.parse(json) : [];
  },

  // Set array
  setArray: (key: string, value: any[]): void => {
    storage.set(key, JSON.stringify(value));
  },

  // Clear all storage (use with caution!)
  clearAll: (): void => {
    storage.clearAll();
  },

  // Remove specific key
  remove: (key: string): void => {
    storage.delete(key);
  },

  // Check if key exists
  exists: (key: string): boolean => {
    return storage.contains(key);
  },
};

// Storage keys - centralized for easy management
export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',

  // Settings
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
  BIOMETRIC_ENABLED: 'biometric_enabled',

  // Offline Queue
  PENDING_RECORDINGS: 'pending_recordings',
  PENDING_NOTES: 'pending_notes',

  // Cache
  RECENT_PATIENTS: 'recent_patients',
  RECORDING_HISTORY: 'recording_history',
} as const;
