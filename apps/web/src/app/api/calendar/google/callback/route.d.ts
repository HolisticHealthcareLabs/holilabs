/**
 * Google Calendar OAuth - Callback Handler
 *
 * GET /api/calendar/google/callback?code=xxx&state=userId
 * Exchanges authorization code for access/refresh tokens
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map