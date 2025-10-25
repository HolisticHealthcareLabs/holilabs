/**
 * Messages API
 *
 * GET /api/messages - Get user's conversations
 * POST /api/messages - Send a new message
 */
import { NextRequest } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * GET - Get conversations for a user
 */
export declare function GET(request: NextRequest): Promise<any>;
/**
 * POST - Send a new message
 */
export declare function POST(request: NextRequest): Promise<any>;
//# sourceMappingURL=route.d.ts.map