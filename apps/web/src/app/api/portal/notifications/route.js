"use strict";
/**
 * Notifications API
 *
 * GET /api/portal/notifications - Get patient's notifications
 * POST /api/portal/notifications/[id]/read - Mark notification as read
 * DELETE /api/portal/notifications/[id] - Delete notification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
// Query parameters schema
const NotificationsQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    unreadOnly: zod_1.z.coerce.boolean().default(false),
    type: zod_1.z.string().optional(),
});
async function GET(request) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const queryValidation = NotificationsQuerySchema.safeParse({
            limit: searchParams.get('limit'),
            unreadOnly: searchParams.get('unreadOnly'),
            type: searchParams.get('type'),
        });
        if (!queryValidation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid query parameters',
                details: queryValidation.error.errors,
            }, { status: 400 });
        }
        const { limit, unreadOnly, type } = queryValidation.data;
        // Build filter conditions
        const where = {
            recipientId: session.patientId,
            recipientType: 'PATIENT',
        };
        if (unreadOnly) {
            where.isRead = false;
        }
        if (type) {
            where.type = type;
        }
        // Fetch notifications
        const notifications = await prisma_1.prisma.notification.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
        // Count unread notifications
        const unreadCount = await prisma_1.prisma.notification.count({
            where: {
                recipientId: session.patientId,
                recipientType: 'PATIENT',
                isRead: false,
            },
        });
        logger_1.default.info({
            event: 'patient_notifications_fetched',
            patientId: session.patientId,
            count: notifications.length,
            unreadCount,
        });
        return server_1.NextResponse.json({
            success: true,
            data: {
                notifications,
                unreadCount,
                total: notifications.length,
            },
        }, { status: 200 });
    }
    catch (error) {
        // Check if it's an auth error
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No autorizado. Por favor, inicia sesión.',
            }, { status: 401 });
        }
        logger_1.default.error({
            event: 'patient_notifications_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar notificaciones.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map