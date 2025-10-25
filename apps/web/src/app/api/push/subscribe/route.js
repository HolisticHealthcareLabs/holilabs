"use strict";
/**
 * Push Notification Subscription API
 *
 * POST /api/push/subscribe - Save push subscription to database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = exports.POST = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const logger_1 = require("@/lib/logger");
const zod_1 = require("zod");
exports.dynamic = 'force-dynamic';
// Subscription schema validation
const SubscriptionSchema = zod_1.z.object({
    endpoint: zod_1.z.string().url(),
    keys: zod_1.z.object({
        p256dh: zod_1.z.string(),
        auth: zod_1.z.string(),
    }),
    expirationTime: zod_1.z.number().nullable().optional(),
});
/**
 * POST /api/push/subscribe
 * Store push notification subscription for the authenticated user
 */
exports.POST = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const body = await request.json();
        // Validate subscription data
        const subscription = SubscriptionSchema.parse(body);
        // Get device info
        const userAgent = request.headers.get('user-agent') || undefined;
        const deviceName = getDeviceName(userAgent);
        const platform = getPlatform(userAgent);
        // Store subscription in database
        const savedSubscription = await prisma_1.prisma.pushSubscription.upsert({
            where: {
                endpoint: subscription.endpoint,
            },
            update: {
                userId: context.user.id,
                userType: 'CLINICIAN',
                keys: subscription.keys,
                userAgent,
                platform,
                deviceName,
                isActive: true,
                failedDeliveries: 0,
                lastUsedAt: new Date(),
            },
            create: {
                userId: context.user.id,
                userType: 'CLINICIAN',
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userAgent,
                platform,
                deviceName,
                isActive: true,
                enabledTypes: [],
            },
        });
        logger_1.logger.info({
            event: 'push_subscription_saved',
            userId: context.user.id,
            endpoint: subscription.endpoint,
            subscriptionId: savedSubscription.id,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Push subscription saved successfully',
            data: { id: savedSubscription.id },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                error: 'Invalid subscription data',
                details: error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            }, { status: 400 });
        }
        logger_1.logger.error({
            event: 'push_subscription_error',
            error: error.message,
        });
        return server_1.NextResponse.json({ error: 'Failed to save push subscription', message: error.message }, { status: 500 });
    }
});
/**
 * DELETE /api/push/subscribe
 * Remove push notification subscription
 */
exports.DELETE = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const { endpoint } = await request.json();
        if (!endpoint) {
            return server_1.NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
        }
        // Delete subscription from database
        await prisma_1.prisma.pushSubscription.updateMany({
            where: {
                userId: context.user.id,
                endpoint,
            },
            data: {
                isActive: false,
            },
        });
        logger_1.logger.info({
            event: 'push_subscription_deleted',
            userId: context.user.id,
            endpoint,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Push subscription removed successfully',
        });
    }
    catch (error) {
        logger_1.logger.error({
            event: 'push_subscription_delete_error',
            error: error.message,
        });
        return server_1.NextResponse.json({ error: 'Failed to remove push subscription', message: error.message }, { status: 500 });
    }
});
/**
 * Get device name from user agent
 */
function getDeviceName(userAgent) {
    if (!userAgent)
        return undefined;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    // Browser detection
    if (userAgent.includes('Chrome'))
        browser = 'Chrome';
    else if (userAgent.includes('Firefox'))
        browser = 'Firefox';
    else if (userAgent.includes('Safari'))
        browser = 'Safari';
    else if (userAgent.includes('Edge'))
        browser = 'Edge';
    // OS detection
    if (userAgent.includes('Windows'))
        os = 'Windows';
    else if (userAgent.includes('Mac'))
        os = 'macOS';
    else if (userAgent.includes('Linux'))
        os = 'Linux';
    else if (userAgent.includes('Android'))
        os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad'))
        os = 'iOS';
    return `${browser} on ${os}`;
}
/**
 * Get platform from user agent
 */
function getPlatform(userAgent) {
    if (!userAgent)
        return undefined;
    if (userAgent.includes('Mobile'))
        return 'mobile';
    if (userAgent.includes('Tablet'))
        return 'tablet';
    return 'web';
}
//# sourceMappingURL=route.js.map