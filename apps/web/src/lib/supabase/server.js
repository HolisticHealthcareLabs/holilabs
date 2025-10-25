"use strict";
/**
 * Supabase Client for Server Components
 *
 * Use this in React Server Components, Server Actions, and Route Handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
function createClient() {
    const cookieStore = (0, headers_1.cookies)();
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            get(name) {
                return cookieStore.get(name)?.value;
            },
            set(name, value, options) {
                try {
                    cookieStore.set({ name, value, ...options });
                }
                catch (error) {
                    // Handle error in middleware
                }
            },
            remove(name, options) {
                try {
                    cookieStore.set({ name, value: '', ...options });
                }
                catch (error) {
                    // Handle error in middleware
                }
            },
        },
    });
}
//# sourceMappingURL=server.js.map