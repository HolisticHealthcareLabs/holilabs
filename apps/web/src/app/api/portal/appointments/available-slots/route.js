"use strict";
/**
 * Available Appointment Slots API
 * Returns available time slots for a given clinician and date
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const patient_session_1 = require("@/lib/auth/patient-session");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
const date_fns_1 = require("date-fns");
const querySchema = zod_1.z.object({
    clinicianId: zod_1.z.string().cuid(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    type: zod_1.z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE']).optional(),
});
// Business hours: 9 AM - 5 PM
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 30;
const BUFFER_MINUTES = 5; // Buffer between appointments
async function GET(request) {
    try {
        // Authenticate patient
        await (0, patient_session_1.requirePatientSession)();
        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const params = {
            clinicianId: searchParams.get('clinicianId'),
            date: searchParams.get('date'),
            type: searchParams.get('type'),
        };
        // Validate parameters
        const validated = querySchema.parse(params);
        // Check if clinician exists
        const clinician = await prisma_1.prisma.user.findUnique({
            where: { id: validated.clinicianId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        if (!clinician || clinician.role !== 'CLINICIAN') {
            return server_1.NextResponse.json({ success: false, error: 'Clinician not found' }, { status: 404 });
        }
        // Parse the date
        const targetDate = (0, date_fns_1.parse)(validated.date, 'yyyy-MM-dd', new Date());
        const now = new Date();
        // Don't allow booking in the past
        if ((0, date_fns_1.isBefore)(targetDate, now)) {
            return server_1.NextResponse.json({
                success: true,
                data: {
                    date: validated.date,
                    slots: [],
                    message: 'Cannot book appointments in the past',
                },
            });
        }
        // Get all existing appointments for this clinician on this date
        const existingAppointments = await prisma_1.prisma.appointment.findMany({
            where: {
                clinicianId: validated.clinicianId,
                startTime: {
                    gte: new Date(validated.date + 'T00:00:00'),
                    lt: new Date(validated.date + 'T23:59:59'),
                },
                status: {
                    notIn: ['CANCELLED', 'NO_SHOW'], // Don't count cancelled appointments
                },
            },
            select: {
                startTime: true,
                endTime: true,
            },
        });
        // Generate all possible time slots for the day
        const slots = [];
        for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
            // Skip lunch hour (1 PM - 2 PM)
            if (hour === 13)
                continue;
            // Add slots every 30 minutes
            for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
                const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                // Create full datetime for this slot
                const slotStart = (0, date_fns_1.parse)(`${validated.date} ${slotTime}`, 'yyyy-MM-dd HH:mm', new Date());
                const slotEnd = (0, date_fns_1.addMinutes)(slotStart, SLOT_DURATION_MINUTES);
                // Check if slot is in the past (with 2-hour buffer)
                const minimumBookingTime = (0, date_fns_1.addMinutes)(now, 120); // 2 hours from now
                if ((0, date_fns_1.isBefore)(slotStart, minimumBookingTime)) {
                    slots.push({
                        time: slotTime,
                        available: false,
                        reason: 'Too soon - minimum 2 hours notice required',
                    });
                    continue;
                }
                // Check if slot conflicts with existing appointments
                let isConflict = false;
                let conflictReason = '';
                for (const appointment of existingAppointments) {
                    const appointmentStart = new Date(appointment.startTime);
                    const appointmentEnd = new Date(appointment.endTime);
                    // Add buffer time
                    const bufferedStart = (0, date_fns_1.addMinutes)(appointmentStart, -BUFFER_MINUTES);
                    const bufferedEnd = (0, date_fns_1.addMinutes)(appointmentEnd, BUFFER_MINUTES);
                    // Check for overlap
                    if (((0, date_fns_1.isAfter)(slotStart, bufferedStart) || slotStart.getTime() === bufferedStart.getTime()) &&
                        ((0, date_fns_1.isBefore)(slotStart, bufferedEnd) || slotStart.getTime() === bufferedEnd.getTime())) {
                        isConflict = true;
                        conflictReason = 'Already booked';
                        break;
                    }
                    if (((0, date_fns_1.isAfter)(slotEnd, bufferedStart) || slotEnd.getTime() === bufferedStart.getTime()) &&
                        ((0, date_fns_1.isBefore)(slotEnd, bufferedEnd) || slotEnd.getTime() === bufferedEnd.getTime())) {
                        isConflict = true;
                        conflictReason = 'Already booked';
                        break;
                    }
                }
                slots.push({
                    time: slotTime,
                    available: !isConflict,
                    ...(isConflict && { reason: conflictReason }),
                });
            }
        }
        // Return available slots
        return server_1.NextResponse.json({
            success: true,
            data: {
                clinician: {
                    id: clinician.id,
                    name: `Dr. ${clinician.firstName} ${clinician.lastName}`,
                },
                date: validated.date,
                slots,
                summary: {
                    total: slots.length,
                    available: slots.filter((s) => s.available).length,
                    booked: slots.filter((s) => !s.available).length,
                },
            },
        });
    }
    catch (error) {
        console.error('Available slots error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid parameters',
                details: error.errors,
            }, { status: 400 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to fetch available slots',
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map