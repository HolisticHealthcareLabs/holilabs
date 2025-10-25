"use strict";
/**
 * Patient Communication Preferences API
 * TCPA & CAN-SPAM Compliant
 *
 * GET /api/patients/[id]/preferences - Get preferences
 * PUT /api/patients/[id]/preferences - Update preferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const middleware_1 = require("@/lib/api/middleware");
const zod_1 = require("zod");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
const UpdatePreferencesSchema = zod_1.z.object({
    // SMS Preferences
    smsEnabled: zod_1.z.boolean().optional(),
    smsAppointments: zod_1.z.boolean().optional(),
    smsPrescriptions: zod_1.z.boolean().optional(),
    smsResults: zod_1.z.boolean().optional(),
    smsReminders: zod_1.z.boolean().optional(),
    smsMarketing: zod_1.z.boolean().optional(),
    // Email Preferences
    emailEnabled: zod_1.z.boolean().optional(),
    emailAppointments: zod_1.z.boolean().optional(),
    emailPrescriptions: zod_1.z.boolean().optional(),
    emailResults: zod_1.z.boolean().optional(),
    emailReminders: zod_1.z.boolean().optional(),
    emailMarketing: zod_1.z.boolean().optional(),
    // Push Preferences
    pushEnabled: zod_1.z.boolean().optional(),
    pushAppointments: zod_1.z.boolean().optional(),
    pushPrescriptions: zod_1.z.boolean().optional(),
    pushResults: zod_1.z.boolean().optional(),
    pushMessages: zod_1.z.boolean().optional(),
    // WhatsApp Preferences
    whatsappEnabled: zod_1.z.boolean().optional(),
    whatsappConsented: zod_1.z.boolean().optional(),
    // Global Settings
    allowEmergencyOverride: zod_1.z.boolean().optional(),
    quietHoursStart: zod_1.z.string().optional(),
    quietHoursEnd: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    preferredLanguage: zod_1.z.string().optional(),
});
// ============================================================================
// GET /api/patients/[id]/preferences
// ============================================================================
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const { id } = context.params;
    // Check if patient exists
    const patient = await prisma_1.prisma.patient.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!patient) {
        return server_1.NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }
    // Get or create preferences
    let preferences = await prisma_1.prisma.patientPreferences.findUnique({
        where: { patientId: id },
    });
    // If no preferences exist, create default ones
    if (!preferences) {
        preferences = await prisma_1.prisma.patientPreferences.create({
            data: {
                patientId: id,
            },
        });
    }
    return server_1.NextResponse.json({
        success: true,
        data: preferences,
    });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
});
// ============================================================================
// PUT /api/patients/[id]/preferences
// ============================================================================
exports.PUT = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    const { id } = context.params;
    const body = await request.json();
    const validated = UpdatePreferencesSchema.parse(body);
    // Check if patient exists
    const patient = await prisma_1.prisma.patient.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!patient) {
        return server_1.NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }
    // Get IP address for consent tracking
    const ipAddress = request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown';
    // Prepare update data
    const updateData = { ...validated };
    // Track SMS consent if SMS is being enabled
    if (validated.smsEnabled && !validated.smsEnabled) {
        updateData.smsConsentedAt = new Date();
        updateData.smsConsentIp = ipAddress;
        updateData.smsConsentMethod = 'web';
        updateData.smsOptedOutAt = null;
    }
    // Track SMS opt-out
    if (validated.smsEnabled === false) {
        updateData.smsOptedOutAt = new Date();
    }
    // Track email consent
    if (validated.emailEnabled && !validated.emailEnabled) {
        updateData.emailConsentedAt = new Date();
        updateData.emailConsentIp = ipAddress;
        updateData.emailConsentMethod = 'web';
        updateData.emailOptedOutAt = null;
    }
    // Track email opt-out
    if (validated.emailEnabled === false) {
        updateData.emailOptedOutAt = new Date();
    }
    // Track WhatsApp consent
    if (validated.whatsappConsented) {
        updateData.whatsappConsentedAt = new Date();
    }
    // Upsert preferences
    const preferences = await prisma_1.prisma.patientPreferences.upsert({
        where: { patientId: id },
        update: updateData,
        create: {
            patientId: id,
            ...updateData,
        },
    });
    return server_1.NextResponse.json({
        success: true,
        data: preferences,
        message: 'Preferences updated successfully',
    });
}, {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'PatientPreferences' },
});
//# sourceMappingURL=route.js.map