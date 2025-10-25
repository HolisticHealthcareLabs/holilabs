/**
 * Public Opt-Out API
 * TCPA & CAN-SPAM Compliant One-Click Unsubscribe
 *
 * GET /api/patients/preferences/opt-out?token=xxx&type=sms|email
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(request: NextRequest): Promise<NextResponse<unknown>>;
//# sourceMappingURL=route.d.ts.map