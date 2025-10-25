"use strict";
/**
 * SMS Notification Service
 * Sends SMS messages via Twilio
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
exports.sendAppointmentConfirmationSMS = sendAppointmentConfirmationSMS;
exports.sendAppointmentReminderSMS = sendAppointmentReminderSMS;
async function sendSMS({ to, message }) {
    // Check if Twilio is configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        console.warn('Twilio not configured - SMS not sent');
        return false;
    }
    try {
        // Use Twilio REST API directly
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: to,
                From: fromNumber,
                Body: message,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            console.error('Twilio API error:', error);
            return false;
        }
        const data = await response.json();
        console.log('SMS sent successfully:', data.sid);
        return true;
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        return false;
    }
}
/**
 * Send appointment confirmation SMS
 */
async function sendAppointmentConfirmationSMS(phone, patientName, dateTime, clinicianName, confirmationUrl) {
    const message = `Hola ${patientName}, tu cita con ${clinicianName} es el ${dateTime}.

Confirma, reagenda o cancela aquí:
${confirmationUrl}

- Holi Labs`;
    return sendSMS({ to: phone, message });
}
/**
 * Send appointment reminder SMS (shorter, for day-of reminders)
 */
async function sendAppointmentReminderSMS(phone, patientName, time, clinicianName) {
    const message = `Recordatorio: ${patientName}, tu cita con ${clinicianName} es hoy a las ${time}.

¡Te esperamos! - Holi Labs`;
    return sendSMS({ to: phone, message });
}
//# sourceMappingURL=sms.js.map