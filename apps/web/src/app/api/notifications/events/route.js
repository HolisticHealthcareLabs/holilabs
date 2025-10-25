"use strict";
/**
 * Notification Events API (Server-Sent Events)
 *
 * GET /api/notifications/events
 * Real-time notification stream using SSE
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const next_auth_1 = require("next-auth");
const auth_1 = require("@/lib/auth");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
exports.dynamic = 'force-dynamic';
async function GET(request) {
    // Set up SSE
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
        async start(controller) {
            try {
                // Get user session
                const clinicianSession = await (0, next_auth_1.getServerSession)(auth_1.authOptions);
                let userId;
                let userType;
                if (clinicianSession?.user?.id) {
                    userId = clinicianSession.user.id;
                    userType = 'CLINICIAN';
                }
                else {
                    try {
                        const patientSession = await (0, patient_session_1.requirePatientSession)();
                        userId = patientSession.patientId;
                        userType = 'PATIENT';
                    }
                    catch (error) {
                        // Send error and close
                        const data = `data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                        controller.close();
                        return;
                    }
                }
                logger_1.default.info({
                    event: 'sse_connection_opened',
                    userId,
                    userType,
                });
                // Send initial connection message
                const connectionMsg = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
                controller.enqueue(encoder.encode(connectionMsg));
                // Keep track of last notification timestamp
                let lastCheck = new Date();
                // Polling interval (check every 5 seconds)
                const interval = setInterval(async () => {
                    try {
                        // Check for new notifications since last check
                        const newNotifications = await prisma_1.prisma.notification.findMany({
                            where: {
                                recipientId: userId,
                                recipientType: userType,
                                createdAt: {
                                    gt: lastCheck,
                                },
                            },
                            orderBy: {
                                createdAt: 'desc',
                            },
                            take: 10,
                        });
                        // Update last check time
                        lastCheck = new Date();
                        // Send new notifications to client
                        if (newNotifications.length > 0) {
                            for (const notification of newNotifications) {
                                const data = `data: ${JSON.stringify({
                                    type: 'notification',
                                    notification,
                                })}\n\n`;
                                controller.enqueue(encoder.encode(data));
                            }
                            logger_1.default.info({
                                event: 'sse_notifications_sent',
                                userId,
                                userType,
                                count: newNotifications.length,
                            });
                        }
                        // Send heartbeat
                        const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
                        controller.enqueue(encoder.encode(heartbeat));
                    }
                    catch (error) {
                        logger_1.default.error({
                            event: 'sse_poll_error',
                            error: error instanceof Error ? error.message : 'Unknown error',
                        });
                    }
                }, 5000); // Poll every 5 seconds
                // Clean up on connection close
                request.signal.addEventListener('abort', () => {
                    clearInterval(interval);
                    controller.close();
                    logger_1.default.info({
                        event: 'sse_connection_closed',
                        userId,
                        userType,
                    });
                });
            }
            catch (error) {
                logger_1.default.error({
                    event: 'sse_start_error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                controller.close();
            }
        },
    });
    return new Response(customReadable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}
//# sourceMappingURL=route.js.map