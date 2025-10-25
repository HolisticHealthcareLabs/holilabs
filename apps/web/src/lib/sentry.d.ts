export declare function initSentry(): void;
export declare function captureException(error: Error, context?: Record<string, any>): void;
export declare function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
export declare function setUserContext(user: {
    id: string;
    email?: string;
    role?: string;
}): void;
export declare function clearUserContext(): void;
export declare function addBreadcrumb(message: string, category: string, data?: Record<string, any>): void;
//# sourceMappingURL=sentry.d.ts.map