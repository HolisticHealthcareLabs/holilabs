/**
 * Calendar Sync Service
 * Bidirectional sync between Holi Labs and external calendars
 */
export declare function syncGoogleCalendar(userId: string): Promise<{
    success: boolean;
    synced: any;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    synced?: undefined;
}>;
export declare function syncMicrosoftCalendar(userId: string): Promise<{
    success: boolean;
    synced: any;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    synced?: undefined;
}>;
export declare function syncAppleCalendar(userId: string): Promise<{
    success: boolean;
    error: string;
    message?: undefined;
    synced?: undefined;
} | {
    success: boolean;
    message: string;
    synced: number;
    error?: undefined;
}>;
export declare function syncAllCalendars(userId: string): Promise<{
    google: any;
    microsoft: any;
    apple: any;
}>;
//# sourceMappingURL=sync.d.ts.map