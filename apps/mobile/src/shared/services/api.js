"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.handleApiError = void 0;
const axios_1 = __importDefault(require("axios"));
const api_1 = require("@/config/api");
const authStore_1 = require("@/store/authStore");
// Create axios instance with default config
const apiClient = axios_1.default.create({
    baseURL: api_1.API_CONFIG.BASE_URL,
    timeout: api_1.API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Request interceptor - add auth token
apiClient.interceptors.request.use((config) => {
    const tokens = authStore_1.useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor - handle token refresh and errors
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
            const tokens = authStore_1.useAuthStore.getState().tokens;
            if (!tokens?.refreshToken) {
                throw new Error('No refresh token available');
            }
            // Attempt token refresh
            const response = await axios_1.default.post(`${api_1.API_CONFIG.BASE_URL}${api_1.API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, { refreshToken: tokens.refreshToken });
            const newTokens = response.data.data;
            authStore_1.useAuthStore.getState().updateTokens(newTokens);
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient(originalRequest);
        }
        catch (refreshError) {
            // Refresh failed - logout user
            authStore_1.useAuthStore.getState().logout();
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
// Helper function to handle API errors
const handleApiError = (error) => {
    if (axios_1.default.isAxiosError(error)) {
        const axiosError = error;
        if (axiosError.response?.data?.message) {
            return axiosError.response.data.message;
        }
        if (axiosError.message) {
            return axiosError.message;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
};
exports.handleApiError = handleApiError;
// Typed API methods
exports.api = {
    // Generic GET
    get: async (url, params) => {
        const response = await apiClient.get(url, { params });
        return response.data.data;
    },
    // Generic POST
    post: async (url, data) => {
        const response = await apiClient.post(url, data);
        return response.data.data;
    },
    // Generic PUT
    put: async (url, data) => {
        const response = await apiClient.put(url, data);
        return response.data.data;
    },
    // Generic PATCH
    patch: async (url, data) => {
        const response = await apiClient.patch(url, data);
        return response.data.data;
    },
    // Generic DELETE
    delete: async (url) => {
        const response = await apiClient.delete(url);
        return response.data.data;
    },
    // File upload with multipart/form-data
    upload: async (url, formData, onProgress) => {
        const response = await apiClient.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total && onProgress) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });
        return response.data.data;
    },
};
exports.default = exports.api;
//# sourceMappingURL=api.js.map