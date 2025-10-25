"use strict";
/**
 * Push Notification Sending API
 *
 * POST /api/push/send - Send push notification to user(s)
 *
 * IMPORTANT: This endpoint requires VAPID keys in environment variables:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:admin@yourdomain.com)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const logger_1 = require("@/lib/logger");
const zod_1 = require("zod");
const web_push_1 = __importDefault(require("web-push"));
exports.dynamic = 'force-dynamic';
// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@holilabs.com';
if (vapidPublicKey && vapidPrivateKey) {
    web_push_1.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}
// Notification payload schema
const NotificationSchema = zod_1.z.object({
    userId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).max(100),
    body: zod_1.z.string().min(1).max(200),
    icon: zod_1.z.string().url().optional(),
    badge: zod_1.z.string().url().optional(),
    data: zod_1.z.record(zod_1.z.any()).optional(),
    actions: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        title: zod_1.z.string(),
    })).optional(),
    requireInteraction: zod_1.z.boolean().optional(),
    tag: zod_1.z.string().optional(),
});
/**
 * POST /api/push/send
 * Send push notification to specific user or all subscribed users
 *
 * Request body:
 * {
 *   "userId": "optional-user-id", // If omitted, sends to all users
 *   "title": "Notification title",
 *   "body": "Notification body",
 *   "icon": "https://...",
 *   "data": { "type": "APPOINTMENT_REMINDER", "appointmentId": "123" }
 * }
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        // Verify VAPID keys are configured
        if (!vapidPublicKey || !vapidPrivateKey) {
            return server_1.NextResponse.json({
                error: 'Push notifications not configured',
                message: 'VAPID keys missing. Run: npx web-push generate-vapid-keys',
            }, { status: 503 });
        }
        const body = await request.json();
        // Validate notification data
        const notification = NotificationSchema.parse(body);
        // Get subscriptions for target user(s)
        const { prisma } = await Promise.resolve().then(() => __importStar(require('@/lib/prisma')));
        const subscriptions = await prisma.pushSubscription.findMany({
            where: notification.userId
                ? { userId: notification.userId, isActive: true }
                : { isActive: true }, // Send to all active subscriptions if no userId specified
        });
        if (subscriptions.length === 0) {
            return server_1.NextResponse.json({ error: 'No push subscriptions found for user' }, { status: 404 });
        }
        // Send push notification to all subscriptions
        const results = await Promise.allSettled(subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys,
            };
            const payload = JSON.stringify({
                title: notification.title,
                body: notification.body,
                icon: notification.icon || '/icon-192x192.png',
                badge: notification.badge || '/icon-192x192.png',
                data: notification.data,
                actions: notification.actions,
                requireInteraction: notification.requireInteraction,
                tag: notification.tag,
            });
            try {
                await web_push_1.default.sendNotification(pushSubscription, payload);
                // Update last used timestamp
                await prisma.pushSubscription.update({
                    where: { id: sub.id },
                    data: {
                        lastUsedAt: new Date(),
                        failedDeliveries: 0,
                    },
                });
                return { success: true, endpoint: sub.endpoint };
            }
            catch (error) {
                logger_1.logger.error({
                    event: 'push_notification_failed',
                    endpoint: sub.endpoint,
                    error: error.message,
                    statusCode: error.statusCode,
                });
                // If subscription is invalid (410 Gone), mark as inactive
                if (error.statusCode === 410) {
                    await prisma.pushSubscription.update({
                        where: { id: sub.id },
                        data: { isActive: false },
                    });
                }
                else {
                    // Increment failed delivery counter
                    await prisma.pushSubscription.update({
                        where: { id: sub.id },
                        data: {
                            failedDeliveries: { increment: 1 },
                        },
                    });
                }
                return { success: false, endpoint: sub.endpoint, error: error.message };
            }
        }));
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        logger_1.logger.info({
            event: 'push_notifications_sent',
            total: results.length,
            successful,
            failed,
            userId: notification.userId || 'all',
        });
        return server_1.NextResponse.json({
            success: true,
            message: `Push notifications sent: ${successful} successful, ${failed} failed`,
            stats: { total: results.length, successful, failed },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                error: 'Invalid notification data',
                details: error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            }, { status: 400 });
        }
        logger_1.logger.error({
            event: 'push_notification_error',
            error: error.message,
        });
        return server_1.NextResponse.json({ error: 'Failed to send push notification', message: error.message }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map