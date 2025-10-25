"use strict";
/**
 * Test Push Notification API
 * Sends a test push notification to the authenticated user
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const send_push_1 = require("@/lib/notifications/send-push");
async function POST(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Send test push notification
        const result = await (0, send_push_1.sendTestNotification)(session.userId);
        if (result.success) {
            return server_1.NextResponse.json({
                success: true,
                message: 'Test notification sent successfully',
                data: {
                    sentCount: result.sentCount,
                },
            });
        }
        else {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to send test notification',
                details: result.errors,
            }, { status: 500 });
        }
    }
    catch (error) {
        console.error('Test push notification error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to send test notification',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map