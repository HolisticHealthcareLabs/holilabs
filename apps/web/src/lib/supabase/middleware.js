"use strict";
/**
 * Supabase Client for Middleware
 *
 * Use this in Next.js middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSession = updateSession;
const ssr_1 = require("@supabase/ssr");
const server_1 = require("next/server");
const logger_1 = require("@/lib/logger");
async function updateSession(request) {
    let response = server_1.NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
    // Check if Supabase env vars are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        logger_1.logger.warn({
            event: 'supabase_config_missing',
            url: supabaseUrl ? 'set' : 'missing',
            key: supabaseAnonKey ? 'set' : 'missing',
        }, 'Missing Supabase environment variables');
        // Return response without Supabase auth check
        return response;
    }
    const supabase = (0, ssr_1.createServerClient)(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name) {
                return request.cookies.get(name)?.value;
            },
            set(name, value, options) {
                request.cookies.set({
                    name,
                    value,
                    ...options,
                });
                response = server_1.NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set({
                    name,
                    value,
                    ...options,
                });
            },
            remove(name, options) {
                request.cookies.set({
                    name,
                    value: '',
                    ...options,
                });
                response = server_1.NextResponse.next({
                    request: {
                        headers: request.headers,
                    },
                });
                response.cookies.set({
                    name,
                    value: '',
                    ...options,
                });
            },
        },
    });
    await supabase.auth.getUser();
    return response;
}
//# sourceMappingURL=middleware.js.map