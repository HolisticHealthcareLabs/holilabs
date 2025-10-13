/**
 * SMS Notification Service
 * Sends SMS messages via Twilio
 */

interface SMSOptions {
  to: string; // Phone number in E.164 format (+521234567890)
  message: string;
}

export async function sendSMS({ to, message }: SMSOptions): Promise<boolean> {
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

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
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
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio API error:', error);
      return false;
    }

    const data = await response.json();
    console.log('SMS sent successfully:', data.sid);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send appointment confirmation SMS
 */
export async function sendAppointmentConfirmationSMS(
  phone: string,
  patientName: string,
  dateTime: string,
  clinicianName: string,
  confirmationUrl: string
): Promise<boolean> {
  const message = `Hola ${patientName}, tu cita con ${clinicianName} es el ${dateTime}.

Confirma, reagenda o cancela aquí:
${confirmationUrl}

- Holi Labs`;

  return sendSMS({ to: phone, message });
}

/**
 * Send appointment reminder SMS (shorter, for day-of reminders)
 */
export async function sendAppointmentReminderSMS(
  phone: string,
  patientName: string,
  time: string,
  clinicianName: string
): Promise<boolean> {
  const message = `Recordatorio: ${patientName}, tu cita con ${clinicianName} es hoy a las ${time}.

¡Te esperamos! - Holi Labs`;

  return sendSMS({ to: phone, message });
}
