"use strict";
/**
 * Push Notification Subscribe API
 * Saves push subscription to database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
const subscriptionSchema = zod_1.z.object({
    subscription: zod_1.z.object({
        endpoint: zod_1.z.string().url(),
        expirationTime: zod_1.z.number().nullable().optional(),
        keys: zod_1.z.object({
            p256dh: zod_1.z.string(),
            auth: zod_1.z.string(),
        }),
    }),
});
async function POST(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse request body
        const body = await request.json();
        const validated = subscriptionSchema.parse(body);
        // Check if subscription already exists
        const existingSubscription = await prisma_1.prisma.pushSubscription.findUnique({
            where: {
                endpoint: validated.subscription.endpoint,
            },
        });
        if (existingSubscription) {
            // Update existing subscription
            const updated = await prisma_1.prisma.pushSubscription.update({
                where: {
                    endpoint: validated.subscription.endpoint,
                },
                data: {
                    userId: session.userId,
                    userType: 'PATIENT',
                    keys: validated.subscription.keys,
                },
            });
            return server_1.NextResponse.json({
                success: true,
                data: {
                    subscriptionId: updated.id,
                },
                message: 'Push subscription updated',
            });
        }
        // Create new subscription
        const subscription = await prisma_1.prisma.pushSubscription.create({
            data: {
                userId: session.userId,
                userType: 'PATIENT',
                endpoint: validated.subscription.endpoint,
                keys: validated.subscription.keys,
            },
        });
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: session.userId,
                action: 'CREATE',
                resource: 'PushSubscription',
                resourceId: subscription.id,
                details: {
                    endpoint: validated.subscription.endpoint,
                },
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                subscriptionId: subscription.id,
            },
            message: 'Push subscription created successfully',
        });
    }
    catch (error) {
        console.error('Push subscription error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid subscription data',
                details: error.errors,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to create push subscription',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map