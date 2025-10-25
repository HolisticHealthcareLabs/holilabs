"use strict";
/**
 * Appointment Reminder Service
 * Orchestrates sending reminders via multiple channels
 * Priority: WhatsApp (98% open rate) → Push → Email → SMS
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAppointmentReminder = sendAppointmentReminder;
exports.sendRemindersForTomorrow = sendRemindersForTomorrow;
const confirmation_1 = require("../appointments/confirmation");
const sms_1 = require("./sms");
const email_1 = require("./email");
const send_push_1 = require("../notifications/send-push");
const whatsapp_1 = require("./whatsapp");
const prisma_1 = require("../prisma");
const logger_1 = __importDefault(require("../logger"));
/**
 * Check if current time is within patient's quiet hours
 */
function checkQuietHours(preferences) {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
        return false;
    }
    try {
        const now = new Date();
        const timezone = preferences.timezone || 'America/Mexico_City';
        // Get current time in patient's timezone
        const currentTime = now.toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
        });
        const quietStart = preferences.quietHoursStart;
        const quietEnd = preferences.quietHoursEnd;
        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if (quietStart > quietEnd) {
            return currentTime >= quietStart || currentTime < quietEnd;
        }
        // Handle same-day quiet hours (e.g., 12:00 to 14:00)
        return currentTime >= quietStart && currentTime < quietEnd;
    }
    catch {
        return false;
    }
}
/**
 * Send appointment confirmation reminder via all available channels
 * Priority: Push → SMS → Email
 */
async function sendAppointmentReminder(appointmentId) {
    try {
        // Get appointment with patient and clinician details
        const appointment = await prisma_1.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: {
                    include: {
                        patientUser: true,
                        preferences: true, // Include preferences
                    },
                },
                clinician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        specialty: true,
                    },
                },
            },
        });
        if (!appointment) {
            return {
                success: false,
                channels: {},
                error: 'Appointment not found',
            };
        }
        // Get or create default preferences
        let preferences = appointment.patient.preferences;
        if (!preferences) {
            preferences = await prisma_1.prisma.patientPreferences.create({
                data: {
                    patientId: appointment.patientId,
                },
            });
        }
        // Check if we're in quiet hours (skip for emergency override)
        const isQuietHours = checkQuietHours(preferences);
        if (isQuietHours && !preferences.allowEmergencyOverride) {
            logger_1.default.info({
                event: 'reminder_skipped_quiet_hours',
                appointmentId,
                patientId: appointment.patientId,
            });
            return {
                success: false,
                channels: {},
                error: 'Skipped: quiet hours active',
            };
        }
        // Generate confirmation link
        const confirmationUrl = await (0, confirmation_1.createConfirmationLink)(appointmentId);
        // Format appointment details
        const details = (0, confirmation_1.formatAppointmentDetails)(appointment);
        const channels = {};
        // 1. Try WhatsApp FIRST (98% open rate, 97% of LATAM has it, $0.005/msg)
        if (appointment.patient.phone &&
            preferences.whatsappEnabled &&
            preferences.whatsappConsented) {
            try {
                const whatsappSuccess = await (0, whatsapp_1.sendAppointmentConfirmationWhatsApp)(appointment.patient.phone, details.patientName, details.dateTime, details.clinicianName, confirmationUrl, 'es' // Spanish for LATAM
                );
                channels.whatsapp = whatsappSuccess;
                // Update confirmation method if WhatsApp succeeded
                if (whatsappSuccess) {
                    await prisma_1.prisma.appointment.update({
                        where: { id: appointmentId },
                        data: { confirmationMethod: 'whatsapp' },
                    });
                    logger_1.default.info({
                        event: 'whatsapp_confirmation_sent',
                        appointmentId,
                        patientPhone: appointment.patient.phone,
                    });
                }
            }
            catch (error) {
                console.error('WhatsApp error:', error);
                channels.whatsapp = false;
            }
        }
        // 2. Try Push Notification (FREE, instant, but requires app installed)
        if (!channels.whatsapp &&
            appointment.patient.patientUser &&
            preferences.pushEnabled &&
            preferences.pushAppointments) {
            try {
                const pushResult = await (0, send_push_1.sendPushNotification)({
                    userId: appointment.patient.patientUser.id,
                    payload: {
                        title: 'Confirma tu cita médica',
                        body: `Cita con ${details.clinicianName} el ${details.dateTime}`,
                        icon: '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        data: {
                            type: 'appointment_confirmation',
                            url: confirmationUrl,
                            appointmentId: appointment.id,
                        },
                        actions: [
                            {
                                action: 'confirm',
                                title: 'Confirmar',
                            },
                            {
                                action: 'view',
                                title: 'Ver Detalles',
                            },
                        ],
                    },
                    urgency: 'high',
                });
                channels.push = pushResult.success;
                // Update confirmation method if push succeeded
                if (pushResult.success && pushResult.sentCount > 0) {
                    await prisma_1.prisma.appointment.update({
                        where: { id: appointmentId },
                        data: { confirmationMethod: 'push' },
                    });
                }
            }
            catch (error) {
                console.error('Push notification error:', error);
                channels.push = false;
            }
        }
        // 3. Fallback to Email (FREE, reliable, 20% open rate)
        if (!channels.whatsapp &&
            !channels.push &&
            appointment.patient.email &&
            preferences.emailEnabled &&
            preferences.emailAppointments) {
            try {
                const emailSuccess = await (0, email_1.sendAppointmentConfirmationEmail)(appointment.patient.email, details.patientName, details.dateTime, details.clinicianName, appointment.type, confirmationUrl);
                channels.email = emailSuccess;
                // Update confirmation method if email succeeded
                if (emailSuccess) {
                    await prisma_1.prisma.appointment.update({
                        where: { id: appointmentId },
                        data: { confirmationMethod: 'email' },
                    });
                }
            }
            catch (error) {
                console.error('Email error:', error);
                channels.email = false;
            }
        }
        // 4. Last resort: SMS (more expensive at $0.02/msg vs $0.005 for WhatsApp)
        if (!channels.whatsapp &&
            !channels.push &&
            !channels.email &&
            appointment.patient.phone &&
            preferences.smsEnabled &&
            preferences.smsAppointments) {
            try {
                const smsSuccess = await (0, sms_1.sendAppointmentConfirmationSMS)(appointment.patient.phone, details.patientName, details.dateTime, details.clinicianName, confirmationUrl);
                channels.sms = smsSuccess;
                // Update confirmation method if SMS succeeded
                if (smsSuccess) {
                    await prisma_1.prisma.appointment.update({
                        where: { id: appointmentId },
                        data: { confirmationMethod: 'sms' },
                    });
                }
            }
            catch (error) {
                console.error('SMS error:', error);
                channels.sms = false;
            }
        }
        // Determine overall success (at least one channel worked)
        const success = Object.values(channels).some((result) => result === true);
        // Log result
        logger_1.default.info({
            event: 'appointment_reminder_sent',
            appointmentId,
            patientId: appointment.patientId,
            channels,
            success,
        });
        return {
            success,
            channels,
        };
    }
    catch (error) {
        logger_1.default.error({
            event: 'appointment_reminder_error',
            appointmentId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
            success: false,
            channels: {},
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Send reminders for all appointments tomorrow
 */
async function sendRemindersForTomorrow() {
    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    // Find appointments tomorrow that need reminders
    const appointments = await prisma_1.prisma.appointment.findMany({
        where: {
            startTime: {
                gte: tomorrow,
                lt: dayAfterTomorrow,
            },
            status: {
                in: ['SCHEDULED', 'CONFIRMED'],
            },
            confirmationStatus: {
                in: ['PENDING', 'SENT'], // Don't spam if already confirmed
            },
            reminderSent: false, // Haven't sent reminder yet
        },
        select: {
            id: true,
        },
    });
    let sent = 0;
    let failed = 0;
    for (const appointment of appointments) {
        const result = await sendAppointmentReminder(appointment.id);
        if (result.success) {
            sent++;
            // Mark reminder as sent
            await prisma_1.prisma.appointment.update({
                where: { id: appointment.id },
                data: {
                    reminderSent: true,
                    reminderSentAt: new Date(),
                },
            });
        }
        else {
            failed++;
        }
        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    logger_1.default.info({
        event: 'daily_reminders_completed',
        total: appointments.length,
        sent,
        failed,
    });
    return {
        total: appointments.length,
        sent,
        failed,
    };
}
//# sourceMappingURL=appointment-reminders.js.map