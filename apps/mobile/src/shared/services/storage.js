"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_KEYS = exports.storageHelpers = exports.storage = void 0;
const react_native_mmkv_1 = require("react-native-mmkv");
// MMKV provides fast, encrypted local storage
exports.storage = new react_native_mmkv_1.MMKV({
    id: 'holi-labs-storage',
    encryptionKey: 'holi-labs-encryption-key-2025', // In production, use a secure key from keychain
});
// Helper functions for common operations
exports.storageHelpers = {
    // Get JSON object
    getObject: (key) => {
        const json = exports.storage.getString(key);
        return json ? JSON.parse(json) : null;
    },
    // Set JSON object
    setObject: (key, value) => {
        exports.storage.set(key, JSON.stringify(value));
    },
    // Get array
    getArray: (key) => {
        const json = exports.storage.getString(key);
        return json ? JSON.parse(json) : [];
    },
    // Set array
    setArray: (key, value) => {
        exports.storage.set(key, JSON.stringify(value));
    },
    // Clear all storage (use with caution!)
    clearAll: () => {
        exports.storage.clearAll();
    },
    // Remove specific key
    remove: (key) => {
        exports.storage.delete(key);
    },
    // Check if key exists
    exists: (key) => {
        return exports.storage.contains(key);
    },
};
// Storage keys - centralized for easy management
exports.STORAGE_KEYS = {
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
};
//# sourceMappingURL=storage.js.map