"use strict";
/**
 * Available Slots API for Rescheduling
 * GET /api/appointments/confirm/[token]/available-slots
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const confirmation_1 = require("@/lib/appointments/confirmation");
const date_fns_1 = require("date-fns");
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
                error: 'Cita no encontrada',
            }, { status: 404 });
        }
        // Get available slots for next 14 days
        const startDate = new Date();
        const endDate = (0, date_fns_1.addDays)(startDate, 14);
        const slots = await (0, confirmation_1.getAvailableSlots)(appointment.clinicianId, startDate, endDate);
        return server_1.NextResponse.json({
            success: true,
            data: {
                slots: slots.map((slot) => ({
                    time: slot.toISOString(),
                    available: true,
                })),
            },
        }, { status: 200 });
    }
    catch (error) {
        logger_1.default.error({
            event: 'available_slots_fetch_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return server_1.NextResponse.json({
            success: false,
            error: 'Error al cargar horarios disponibles',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map