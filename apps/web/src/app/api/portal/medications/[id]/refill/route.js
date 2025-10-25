"use strict";
/**
 * Medication Refill Request API
 *
 * POST /api/portal/medications/[id]/refill
 * Request a refill for a medication
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const logger_1 = __importDefault(require("@/lib/logger"));
const zod_1 = require("zod");
const RefillRequestSchema = zod_1.z.object({
    notes: zod_1.z.string().optional(),
    pharmacy: zod_1.z.string().optional(),
});
async function POST(request, { params }) {
    try {
        // Authenticate patient
        const session = await (0, patient_session_1.requirePatientSession)();
        const { id } = params;
        if (!id) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Medication ID is required',
            }, { status: 400 });
        }
        // Parse request body
        const body = await request.json();
        const validation = RefillRequestSchema.safeParse(body);
        if (!validation.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Datos inválidos',
                details: validation.error.errors,
            }, { status: 400 });
        }
        const { notes, pharmacy } = validation.data;
        // Fetch medication
        const medication = await prisma_1.prisma.medication.findUnique({
            where: { id },
            select: {
                id: true,
                patientId: true,
                name: true,
                isActive: true,
            },
        });
        if (!medication) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Medicamento no encontrado.',
            }, { status: 404 });
        }
        // Verify the medication belongs to the authenticated patient
        if (medication.patientId !== session.patientId) {
            logger_1.default.warn({
                event: 'unauthorized_refill_request_attempt',
                patientId: session.patientId,
                requestedMedicationId: id,
            });
            return server_1.NextResponse.json({
                success: false,
                error: 'No tienes permiso para solicitar renovación de este medicamento.',
            }, { status: 403 });
        }
        // Check if medication is active
        if (!medication.isActive) {
            return server_1.NextResponse.json({
                success: false,
                error: 'No puedes solicitar renovación de un medicamento inactivo.',
            }, { status: 400 });
        }
        // In production, you would create a RefillRequest record
        // For now, we'll create a mock refill request and log it
        const refillRequest = {
            id: `refill_${Date.now()}`,
            medicationId: medication.id,
            patientId: session.patientId,
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            notes,
            pharmacy,
        };
        // Create audit log
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: session.userId,
                userEmail: session.email,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                action: 'CREATE',
                resource: 'RefillRequest',
                resourceId: refillRequest.id,
                success: true,
                details: {
                    medicationId: medication.id,
                    medicationName: medication.name,
                    notes,
                    pharmacy,
                },
            },
        });
        logger_1.default.info({
            event: 'refill_requested',
            patientId: session.patientId,
            medicationId: medication.id,
            refillRequestId: refillRequest.id,
        });
        return server_1.NextResponse.json({
            success: true,
            message: 'Solicitud de renovación enviada. Tu médico la revisará pronto.',
            data: refillRequest,
        }, { status: 201 });
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
            event: 'refill_request_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al solicitar renovación.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map