/**
 * Next.js Middleware for Authentication, i18n, and Security
 *
 * Protects dashboard routes, manages Supabase sessions, handles locale routing, and applies security headers
 */
import { type NextRequest } from 'next/server';
export declare function middleware(request: NextRequest): Promise<any>;
export declare const config: {
    matcher: string[];
};
//# sourceMappingURL=middleware.d.ts.map