"use strict";
/**
 * Supabase Client for Client Components
 *
 * Use this in React Client Components (with 'use client')
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const ssr_1 = require("@supabase/ssr");
function createClient() {
    return (0, ssr_1.createBrowserClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
//# sourceMappingURL=client.js.map