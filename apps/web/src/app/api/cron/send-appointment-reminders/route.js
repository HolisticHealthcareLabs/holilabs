"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const appointment_reminders_1 = require("@/lib/notifications/appointment-reminders");
const logger_1 = __importDefault(require("@/lib/logger"));
exports.dynamic = 'force-dynamic';
exports.maxDuration = 300; // 5 minutes max execution time
async function GET(request) {
    try {
        // Security: Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            logger_1.default.warn({
                event: 'unauthorized_cron_access',
                ip: request.headers.get('x-forwarded-for') || 'unknown',
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'Unauthorized',
            }, { status: 401 });
        }
        logger_1.default.info({
            event: 'cron_job_started',
            job: 'send_appointment_reminders',
            timestamp: new Date().toISOString(),
        });
        // Send all reminders
        const result = await (0, appointment_reminders_1.sendRemindersForTomorrow)();
        logger_1.default.info({
            event: 'cron_job_completed',
            job: 'send_appointment_reminders',
            result,
        });
        return server_1.NextResponse.json({
            success: true,
            data: result,
            message: `Sent ${result.sent} reminders, ${result.failed} failed`,
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'cron_job_error',
            job: 'send_appointment_reminders',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Internal server error',
        }, { status: 500 });
    }
}
// Allow POST as well for manual triggering
async function POST(request) {
    return GET(request);
}
//# sourceMappingURL=route.js.map