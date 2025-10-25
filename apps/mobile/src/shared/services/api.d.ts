export declare const handleApiError: (error: unknown) => string;
export declare const api: {
    get: <T>(url: string, params?: any) => Promise<T>;
    post: <T>(url: string, data?: any) => Promise<T>;
    put: <T>(url: string, data?: any) => Promise<T>;
    patch: <T>(url: string, data?: any) => Promise<T>;
    delete: <T>(url: string) => Promise<T>;
    upload: <T>(url: string, formData: FormData, onProgress?: (progress: number) => void) => Promise<T>;
};
export default api;
//# sourceMappingURL=api.d.ts.map