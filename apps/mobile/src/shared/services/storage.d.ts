import { MMKV } from 'react-native-mmkv';
export declare const storage: MMKV;
export declare const storageHelpers: {
    getObject: <T>(key: string) => T | null;
    setObject: (key: string, value: any) => void;
    getArray: <T>(key: string) => T[];
    setArray: (key: string, value: any[]) => void;
    clearAll: () => void;
    remove: (key: string) => void;
    exists: (key: string) => boolean;
};
export declare const STORAGE_KEYS: {
    readonly AUTH_TOKEN: "auth_token";
    readonly REFRESH_TOKEN: "refresh_token";
    readonly USER_DATA: "user_data";
    readonly THEME_MODE: "theme_mode";
    readonly LANGUAGE: "language";
    readonly BIOMETRIC_ENABLED: "biometric_enabled";
    readonly PENDING_RECORDINGS: "pending_recordings";
    readonly PENDING_NOTES: "pending_notes";
    readonly RECENT_PATIENTS: "recent_patients";
    readonly RECORDING_HISTORY: "recording_history";
};
//# sourceMappingURL=storage.d.ts.map