"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCSRFToken = useCSRFToken;
exports.useCSRFFetch = useCSRFFetch;
exports.withCSRFToken = withCSRFToken;
/**
 * CSRF Token Hook
 *
 * Provides CSRF token for client-side requests
 */
const react_1 = require("react");
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
/**
 * Hook to get CSRF token from cookie
 */
function useCSRFToken() {
    const [token, setToken] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const getToken = () => {
            const cookies = document.cookie.split(';');
            const csrfCookie = cookies.find(cookie => cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
            if (csrfCookie) {
                return csrfCookie.split('=')[1];
            }
            return null;
        };
        setToken(getToken());
        // Watch for cookie changes
        const interval = setInterval(() => {
            setToken(getToken());
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    return token;
}
/**
 * Hook to get fetch options with CSRF token
 */
function useCSRFFetch() {
    const token = useCSRFToken();
    const fetchWithCSRF = async (url, options = {}) => {
        const headers = new Headers(options.headers);
        if (token && !headers.has(CSRF_HEADER_NAME)) {
            headers.set(CSRF_HEADER_NAME, token);
        }
        return fetch(url, {
            ...options,
            headers,
        });
    };
    return fetchWithCSRF;
}
/**
 * Helper function to add CSRF token to fetch options
 */
function withCSRFToken(options = {}) {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
    const token = csrfCookie?.split('=')[1];
    if (!token) {
        console.warn('CSRF token not found in cookies');
        return options;
    }
    return {
        ...options,
        headers: {
            ...options.headers,
            [CSRF_HEADER_NAME]: token,
        },
    };
}
//# sourceMappingURL=useCSRF.js.map