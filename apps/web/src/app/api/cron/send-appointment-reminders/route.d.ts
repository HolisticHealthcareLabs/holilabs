/**
 * Cron Job: Send Appointment Reminders
 * GET /api/cron/send-appointment-reminders
 *
 * Called daily at 8 PM to send reminders for tomorrow's appointments
 * Can be triggered by:
 * 1. Vercel Cron (vercel.json configuration)
 * 2. GitHub Actions (scheduled workflow)
 * 3. External cron service (cron-job.org, EasyCron)
 * 4. Manual trigger for testing
 */
import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const maxDuration = 300;
export declare function GET(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
    message: string;
}>>;
export declare function POST(request: NextRequest): Promise<NextResponse<{
    success: boolean;
    error: string;
}> | NextResponse<{
    success: boolean;
    data: any;
    message: string;
}>>;
//# sourceMappingURL=route.d.ts.map