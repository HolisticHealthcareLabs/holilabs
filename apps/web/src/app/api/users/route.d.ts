/**
 * User API - Create and List Users
 *
 * POST /api/users - Create new user in Prisma database
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * POST /api/users
 * Create new user profile (called after Supabase signup)
 */
export declare function POST(request: Request): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map