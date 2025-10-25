"use strict";
/**
 * Feedback API Endpoint
 *
 * Handles user feedback submissions during A/B testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("@/lib/prisma"));
const feedbackSchema = zod_1.z.object({
    type: zod_1.z.enum(['bug', 'feature', 'improvement', 'general']),
    message: zod_1.z.string().min(10, 'Message must be at least 10 characters').max(5000),
    email: zod_1.z.string().email().optional().nullable(),
    url: zod_1.z.string().url().optional(),
    userAgent: zod_1.z.string().optional(),
});
async function POST(request) {
    try {
        const body = await request.json();
        // Validate input
        let validatedData;
        try {
            validatedData = feedbackSchema.parse(body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return server_1.NextResponse.json({
                    error: 'Validation failed',
                    message: 'Please check your input and try again',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                }, { status: 400 });
            }
            throw error;
        }
        // Get user ID from session (if authenticated)
        // TODO: Get session user ID when auth is implemented
        const userId = undefined; // Replace with actual user ID from session
        // Store feedback in database
        // For now, we'll log it to console and could store in a feedback table
        // In production, you might want to:
        // 1. Store in database
        // 2. Send to Slack/Discord
        // 3. Send to email
        // 4. Send to PostHog as an event
        console.log('📝 User Feedback Received:', {
            type: validatedData.type,
            message: validatedData.message,
            email: validatedData.email,
            url: validatedData.url,
            userAgent: validatedData.userAgent,
            userId,
            timestamp: new Date().toISOString(),
        });
        // TODO: Create a Feedback model in Prisma and store it
        // Example:
        // const feedback = await prisma.feedback.create({
        //   data: {
        //     type: validatedData.type,
        //     message: validatedData.message,
        //     email: validatedData.email,
        //     url: validatedData.url,
        //     userAgent: validatedData.userAgent,
        //     userId,
        //   },
        // });
        // For now, we'll create an audit log entry
        if (userId) {
            await prisma_1.default.auditLog.create({
                data: {
                    userId,
                    action: 'CREATE',
                    resource: 'feedback',
                    resourceId: 'n/a',
                    ipAddress: '0.0.0.0',
                    details: {
                        type: validatedData.type,
                        messageLength: validatedData.message.length,
                        hasEmail: !!validatedData.email,
                        url: validatedData.url,
                    },
                },
            });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Feedback received successfully',
        });
    }
    catch (error) {
        console.error('Error handling feedback:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error',
            message: 'Failed to submit feedback',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map