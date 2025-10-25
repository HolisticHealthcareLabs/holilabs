"use strict";
/**
 * SMS Notification Service (Twilio)
 *
 * Simple, reliable SMS delivery for healthcare notifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
exports.sendAppointmentReminderSMS = sendAppointmentReminderSMS;
exports.sendNewMessageSMS = sendNewMessageSMS;
exports.sendConsultationCompletedSMS = sendConsultationCompletedSMS;
exports.sendOTPCodeSMS = sendOTPCodeSMS;
exports.sendMagicLinkSMS = sendMagicLinkSMS;
exports.sendPrescriptionReadySMS = sendPrescriptionReadySMS;
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.formatPhoneNumber = formatPhoneNumber;
const twilio_1 = __importDefault(require("twilio"));
const logger_1 = __importDefault(require("./logger"));
const getTwilioClient = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured');
    }
    return (0, twilio_1.default)(accountSid, authToken);
};
const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER || '';
/**
 * Send SMS via Twilio
 */
async function sendSMS(options) {
    try {
        const { to, message } = options;
        // Validate required fields
        if (!to || !message) {
            throw new Error('SMS requires recipient phone and message');
        }
        // Check if Twilio is configured
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            logger_1.default.warn({
                event: 'sms_send_skipped',
                reason: 'Twilio credentials not configured',
                to,
            });
            return { success: false, error: 'SMS service not configured' };
        }
        if (!FROM_PHONE) {
            logger_1.default.warn({
                event: 'sms_send_skipped',
                reason: 'TWILIO_PHONE_NUMBER not configured',
                to,
            });
            return { success: false, error: 'SMS phone number not configured' };
        }
        // Format phone number (add +52 for Mexico if not present)
        let formattedPhone = to.trim();
        if (!formattedPhone.startsWith('+')) {
            // Assume Mexico if no country code
            formattedPhone = `+52${formattedPhone}`;
        }
        // Send SMS
        const client = getTwilioClient();
        const response = await client.messages.create({
            body: message,
            from: FROM_PHONE,
            to: formattedPhone,
        });
        logger_1.default.info({
            event: 'sms_sent',
            to: formattedPhone,
            messageId: response.sid,
            status: response.status,
        });
        return { success: true, data: response };
    }
    catch (error) {
        logger_1.default.error({
            event: 'sms_send_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            to: options.to,
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send SMS',
        };
    }
}
/**
 * Send appointment reminder SMS
 */
async function sendAppointmentReminderSMS(phoneNumber, patientName, appointmentDate, clinicianName) {
    const dateStr = appointmentDate.toLocaleDateString('es-MX', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    const message = `Hola ${patientName}, recordatorio de tu cita con ${clinicianName} el ${dateStr}. Por favor llega 10 min antes. - Holi Labs`;
    return sendSMS({
        to: phoneNumber,
        message,
    });
}
/**
 * Send new message notification SMS
 */
async function sendNewMessageSMS(phoneNumber, recipientName, senderName) {
    const message = `Hola ${recipientName}, ${senderName} te ha enviado un mensaje. Revisa tu portal en holilabs.com - Holi Labs`;
    return sendSMS({
        to: phoneNumber,
        message,
    });
}
/**
 * Send consultation completed SMS
 */
async function sendConsultationCompletedSMS(phoneNumber, patientName, clinicianName) {
    const message = `Hola ${patientName}, tu consulta con ${clinicianName} ha sido completada. Las notas médicas ya están disponibles en tu portal. - Holi Labs`;
    return sendSMS({
        to: phoneNumber,
        message,
    });
}
/**
 * Send OTP code SMS
 */
async function sendOTPCodeSMS(phoneNumber, code) {
    const message = `Tu código de verificación de Holi Labs es: ${code}. Válido por 10 minutos. No compartas este código.`;
    return sendSMS({
        to: phoneNumber,
        message,
    });
}
/**
 * Send magic link SMS
 */
async function sendMagicLinkSMS(phoneNumber, link) {
    const message = `Tu enlace de acceso a Holi Labs: ${link}\n\nVálido por 15 minutos. No compartas este enlace.`;
    return sendSMS({
        to: phoneNumber,
        message,
    });
}
/**
 * Send prescription ready SMS
 */
async function sendPrescriptionReadySMS(phoneNumber, patientName, clinicianName) {
    const message = `Hola ${patientName}, ${clinicianName} ha creado una nueva receta para ti. Revisa tu portal para ver los detalles. - Holi Labs`;
    return sendSMS({
        to: phoneNumber,
        message,
    });
}
/**
 * Validate phone number format
 */
function isValidPhoneNumber(phone) {
    // Basic validation for Mexican phone numbers
    const phoneRegex = /^(\+52)?[0-9]{10}$/;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleaned);
}
/**
 * Format phone number for display
 */
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+52')) {
        const number = cleaned.slice(3);
        return `+52 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    }
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
}
//# sourceMappingURL=sms.js.map