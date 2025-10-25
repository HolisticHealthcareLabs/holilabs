"use strict";
/**
 * Appointment Confirmation API
 * GET /api/appointments/confirm/[token] - Get appointment details
 * POST /api/appointments/confirm/[token] - Confirm/Cancel/Reschedule appointment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const confirmation_1 = require("@/lib/appointments/confirmation");
const logger_1 = __importDefault(require("@/lib/logger"));
async function GET(request, { params }) {
    try {
        const { token } = params;
        if (!token) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Token is required',
            }, { status: 400 });
        }
        const appointment = await (0, confirmation_1.getAppointmentByToken)(token);
        if (!appointment) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Cita no encontrada o enlace inv válido.',
            }, { status: 404 });
        }
        // Format appointment details
        const details = (0, confirmation_1.formatAppointmentDetails)(appointment);
        return server_1.NextResponse.json({
            success: true,
            data: {
                appointment: {
                    id: appointment.id,
                    ...details,
                    status: appointment.status,
                    confirmationStatus: appointment.confirmationStatus,
                    type: appointment.type,
                    description: appointment.description,
                },
            },
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'appointment_confirmation_get_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar la cita.',
        }, { status: 500 });
    }
}
async function POST(request, { params }) {
    try {
        const { token } = params;
        const body = await request.json();
        const { action, newTime, reason } = body;
        if (!token) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Token is required',
            }, { status: 400 });
        }
        if (!action) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Action is required',
            }, { status: 400 });
        }
        let result;
        let message;
        switch (action) {
            case 'confirm':
                result = await (0, confirmation_1.confirmAppointment)(token);
                message = '✅ Cita confirmada exitosamente';
                break;
            case 'cancel':
                result = await (0, confirmation_1.cancelAppointment)(token, reason);
                message = '❌ Cita cancelada exitosamente';
                break;
            case 'reschedule':
                if (!newTime) {
                    return server_1.NextResponse.json({
                        success: false,
                        error: 'Nueva fecha y hora requerida para reagendar',
                    }, { status: 400 });
                }
                result = await (0, confirmation_1.requestReschedule)(token, new Date(newTime), reason);
                message = '🔄 Solicitud de reagendamiento enviada al médico';
                break;
            default:
                return server_1.NextResponse.json({
                    success: false,
                    error: 'Invalid action',
                }, { status: 400 });
        }
        logger_1.default.info({
            event: 'appointment_confirmation_action',
            action,
            appointmentId: result.id,
            patientId: result.patientId,
        });
        return server_1.NextResponse.json({
            success: true,
            message,
            data: {
                appointment: {
                    id: result.id,
                    status: result.status,
                    confirmationStatus: result.confirmationStatus,
                },
            },
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'appointment_confirmation_action_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Return user-friendly error messages
        if (error instanceof Error) {
            return server_1.NextResponse.json({
                success: false,
                error: error.message,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al procesar la solicitud.',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map