/**
 * Email Templates
 * HTML email templates for various notifications
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com';

/**
 * Base email template wrapper
 */
function emailWrapper(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f9fc; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
    .button { display: inline-block; padding: 14px 28px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #f7f9fc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
    .footer a { color: #667eea; text-decoration: none; }
    .info-box { background-color: #edf2f7; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .warning-box { background-color: #fff5f5; border-left: 4px solid #f56565; padding: 16px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Holi Labs</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from Holi Labs.</p>
      <p>
        <a href="${BASE_URL}">Visit Portal</a> •
        <a href="${BASE_URL}/legal/privacy-policy">Privacy Policy</a> •
        <a href="${BASE_URL}/support">Support</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
        © ${new Date().getFullYear()} Holi Labs. All rights reserved.<br>
        HIPAA & LGPD Compliant Healthcare Platform
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Consent Expiration Reminder
 */
export function consentExpirationTemplate(data: {
  patientName: string;
  consentType: string;
  expiresAt: Date;
  renewUrl: string;
}): { subject: string; html: string; text: string } {
  const daysUntilExpiration = Math.ceil(
    (data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const html = emailWrapper(
    `
      <h2>Your Consent is Expiring Soon</h2>
      <p>Dear ${data.patientName},</p>
      <p>This is a friendly reminder that your consent for <strong>${data.consentType}</strong> will expire in <strong>${daysUntilExpiration} days</strong>.</p>

      <div class="info-box">
        <strong>Expiration Date:</strong> ${data.expiresAt.toLocaleDateString()}<br>
        <strong>Consent Type:</strong> ${data.consentType}
      </div>

      <p>To continue receiving uninterrupted care, please renew your consent by clicking the button below:</p>

      <a href="${data.renewUrl}" class="button">Renew Consent</a>

      <p style="color: #718096; font-size: 14px;">If you have any questions or concerns, please contact our office.</p>
    `,
    `Your ${data.consentType} consent expires in ${daysUntilExpiration} days`
  );

  const text = `
Dear ${data.patientName},

Your consent for ${data.consentType} will expire in ${daysUntilExpiration} days.

Expiration Date: ${data.expiresAt.toLocaleDateString()}

To renew your consent, visit: ${data.renewUrl}

If you have any questions, please contact our office.

- Holi Labs Team
  `.trim();

  return {
    subject: `Consent Expiration Reminder: ${data.consentType}`,
    html,
    text,
  };
}

/**
 * Appointment Reminder
 */
export function appointmentReminderTemplate(data: {
  patientName: string;
  appointmentDate: Date;
  doctorName: string;
  appointmentType: string;
  location: string;
  rescheduleUrl: string;
}): { subject: string; html: string; text: string } {
  const html = emailWrapper(
    `
      <h2>Appointment Reminder</h2>
      <p>Dear ${data.patientName},</p>
      <p>This is a reminder of your upcoming appointment:</p>

      <div class="info-box">
        <strong>Date & Time:</strong> ${data.appointmentDate.toLocaleString()}<br>
        <strong>Doctor:</strong> ${data.doctorName}<br>
        <strong>Type:</strong> ${data.appointmentType}<br>
        <strong>Location:</strong> ${data.location}
      </div>

      <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>

      <a href="${data.rescheduleUrl}" class="button">View Details</a>

      <p style="color: #718096; font-size: 14px;">Need to reschedule? <a href="${data.rescheduleUrl}">Click here</a></p>
    `,
    `Appointment with ${data.doctorName} on ${data.appointmentDate.toLocaleDateString()}`
  );

  const text = `
Dear ${data.patientName},

Appointment Reminder:

Date & Time: ${data.appointmentDate.toLocaleString()}
Doctor: ${data.doctorName}
Type: ${data.appointmentType}
Location: ${data.location}

Please arrive 10 minutes early.

View details: ${data.rescheduleUrl}

- Holi Labs Team
  `.trim();

  return {
    subject: `Appointment Reminder: ${data.appointmentDate.toLocaleDateString()}`,
    html,
    text,
  };
}

/**
 * Lab Results Available
 */
export function labResultsAvailableTemplate(data: {
  patientName: string;
  testName: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const html = emailWrapper(
    `
      <h2>Your Lab Results Are Ready</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your lab results for <strong>${data.testName}</strong> are now available in your patient portal.</p>

      <a href="${data.portalUrl}" class="button">View Results</a>

      <p style="color: #718096; font-size: 14px;">If you have questions about your results, please contact your healthcare provider.</p>
    `,
    `Your ${data.testName} results are ready`
  );

  const text = `
Dear ${data.patientName},

Your lab results for ${data.testName} are now available.

View your results: ${data.portalUrl}

If you have questions, please contact your healthcare provider.

- Holi Labs Team
  `.trim();

  return {
    subject: `Lab Results Available: ${data.testName}`,
    html,
    text,
  };
}

/**
 * Data Deletion Confirmation Request
 */
export function dataDeletionConfirmationTemplate(data: {
  patientName: string;
  confirmationUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const html = emailWrapper(
    `
      <h2>Confirm Data Deletion Request</h2>
      <p>Dear ${data.patientName},</p>
      <p>We received a request to permanently delete your medical records and account data.</p>

      <div class="warning-box">
        <strong>⚠️ Warning:</strong> This action is permanent and cannot be undone. All your medical records, appointments, and account information will be permanently deleted.
      </div>

      <p><strong>If you did not make this request, please ignore this email.</strong> Your data will remain safe.</p>

      <p>To confirm deletion, click the button below. This link will expire in 24 hours.</p>

      <a href="${data.confirmationUrl}" class="button" style="background-color: #f56565;">Confirm Deletion</a>

      <p style="color: #718096; font-size: 14px;">Link expires: ${data.expiresAt.toLocaleString()}</p>
    `,
    `Confirm your data deletion request`
  );

  const text = `
Dear ${data.patientName},

We received a request to permanently delete your medical records and account data.

⚠️ WARNING: This action is permanent and cannot be undone.

If you did not make this request, please ignore this email.

To confirm deletion, visit: ${data.confirmationUrl}

This link expires: ${data.expiresAt.toLocaleString()}

- Holi Labs Team
  `.trim();

  return {
    subject: 'Confirm Data Deletion Request',
    html,
    text,
  };
}

/**
 * Consent Version Update Notification
 */
export function consentVersionUpdateTemplate(data: {
  patientName: string;
  consentType: string;
  changes: string[];
  reviewUrl: string;
}): { subject: string; html: string; text: string } {
  const html = emailWrapper(
    `
      <h2>Updated Consent Terms</h2>
      <p>Dear ${data.patientName},</p>
      <p>We have updated the terms for <strong>${data.consentType}</strong>.</p>

      <div class="info-box">
        <strong>Changes:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${data.changes.map((change) => `<li>${change}</li>`).join('')}
        </ul>
      </div>

      <p>Please review the updated terms and provide your consent to continue using this service.</p>

      <a href="${data.reviewUrl}" class="button">Review & Accept</a>
    `,
    `Consent terms updated for ${data.consentType}`
  );

  const text = `
Dear ${data.patientName},

We have updated the terms for ${data.consentType}.

Changes:
${data.changes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Please review and accept: ${data.reviewUrl}

- Holi Labs Team
  `.trim();

  return {
    subject: `Updated Consent Terms: ${data.consentType}`,
    html,
    text,
  };
}

/**
 * Medication Refill Reminder
 */
export function medicationRefillTemplate(data: {
  patientName: string;
  medicationName: string;
  daysLeft: number;
  requestUrl: string;
}): { subject: string; html: string; text: string } {
  const html = emailWrapper(
    `
      <h2>Medication Refill Reminder</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your prescription for <strong>${data.medicationName}</strong> is running low.</p>

      <div class="info-box">
        <strong>Days of supply remaining:</strong> ${data.daysLeft} days<br>
        <strong>Medication:</strong> ${data.medicationName}
      </div>

      <p>To request a refill, click the button below:</p>

      <a href="${data.requestUrl}" class="button">Request Refill</a>
    `,
    `Refill reminder for ${data.medicationName}`
  );

  const text = `
Dear ${data.patientName},

Your prescription for ${data.medicationName} is running low.

Days remaining: ${data.daysLeft}

Request refill: ${data.requestUrl}

- Holi Labs Team
  `.trim();

  return {
    subject: `Medication Refill Reminder: ${data.medicationName}`,
    html,
    text,
  };
}
