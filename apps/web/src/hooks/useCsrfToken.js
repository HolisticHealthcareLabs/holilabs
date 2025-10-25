"use strict";
/**
 * React Hook for CSRF Token Management
 */
'use client';
/**
 * React Hook for CSRF Token Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCsrfToken = useCsrfToken;
const react_1 = require("react");
const csrf_1 = require("@/lib/client/csrf");
function useCsrfToken() {
    const [token, setToken] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        async function loadToken() {
            try {
                const csrfToken = await (0, csrf_1.fetchCsrfToken)();
                if (mounted) {
                    setToken(csrfToken);
                    setError(null);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err);
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }
        loadToken();
        return () => {
            mounted = false;
        };
    }, []);
    return { token, loading, error };
}
//# sourceMappingURL=useCsrfToken.js.map