/**
 * GDPR/LGPD Deletion Request Email Service
 *
 * Sends confirmation emails for patient data deletion requests
 * @compliance GDPR Article 17, LGPD Article 18, CCPA
 */

import { sendEmail, queueEmail } from './email-service';

interface DeletionEmailParams {
  email: string;
  patientName: string;
  confirmationToken: string;
  confirmationDeadline: Date;
}

/**
 * Send deletion confirmation email to patient
 * @param params Deletion email parameters
 */
export async function sendDeletionConfirmationEmail(
  params: DeletionEmailParams
): Promise<void> {
  const { email, patientName, confirmationToken, confirmationDeadline } = params;

  // Base URL for confirmation link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmationUrl = `${baseUrl}/api/patients/deletion/confirm/${confirmationToken}`;

  // Format deadline date
  const deadlineFormatted = confirmationDeadline.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailSubject = 'Confirm Your Data Deletion Request - Holi Labs';

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Data Deletion</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: #dc3545;
      color: white !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #c82333;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      border: 1px solid #e0e0e0;
      border-top: none;
      font-size: 12px;
      color: #6c757d;
    }
    .info-list {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .info-list li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔒 Data Deletion Request</h1>
  </div>

  <div class="content">
    <p>Hello ${patientName},</p>

    <p>We received a request to permanently delete your patient data from Holi Labs. This action cannot be undone.</p>

    <div class="warning-box">
      <strong>⚠️ Important:</strong> Confirming this request will permanently delete all your medical records, appointments, notes, and personal information from our system.
    </div>

    <h3>What will be deleted:</h3>
    <div class="info-list">
      <ul>
        <li>Personal information (name, contact details, identifiers)</li>
        <li>Medical history and clinical notes</li>
        <li>Appointment records</li>
        <li>Prescriptions and medications</li>
        <li>Lab results and imaging studies</li>
        <li>Messages and communications</li>
      </ul>
    </div>

    <h3>What will be preserved:</h3>
    <div class="info-list">
      <ul>
        <li>Anonymized records for legal compliance</li>
        <li>Audit logs (required by healthcare regulations)</li>
        <li>Financial records (required by law)</li>
      </ul>
    </div>

    <p><strong>To confirm this deletion request, click the button below:</strong></p>

    <center>
      <a href="${confirmationUrl}" class="button">
        Confirm Data Deletion
      </a>
    </center>

    <p style="margin-top: 30px; font-size: 14px;">
      <strong>Deadline:</strong> This link expires on ${deadlineFormatted}<br>
      <strong>Legal Basis:</strong> GDPR Article 17 - Right to Erasure
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 13px; color: #6c757d;">
      If you did not request this deletion, please ignore this email or contact our support team immediately at <a href="mailto:privacy@holilabs.com">privacy@holilabs.com</a>
    </p>

    <p style="font-size: 13px; color: #6c757d;">
      <strong>Alternative confirmation:</strong> If the button doesn't work, copy and paste this URL into your browser:<br>
      <span style="word-break: break-all; color: #007bff;">${confirmationUrl}</span>
    </p>
  </div>

  <div class="footer">
    <p>This email was sent by Holi Labs<br>
    Privacy Policy: <a href="${baseUrl}/privacy">holilabs.com/privacy</a><br>
    Data Protection Officer: <a href="mailto:dpo@holilabs.com">dpo@holilabs.com</a></p>

    <p style="margin-top: 15px;">
      © ${new Date().getFullYear()} Holi Labs. All rights reserved.<br>
      <small>This is an automated security notice.</small>
    </p>
  </div>
</body>
</html>
  `;

  const emailText = `
Holi Labs - Data Deletion Request

Hello ${patientName},

We received a request to permanently delete your patient data from Holi Labs. This action cannot be undone.

⚠️ Important: Confirming this request will permanently delete all your medical records, appointments, notes, and personal information from our system.

What will be deleted:
- Personal information (name, contact details, identifiers)
- Medical history and clinical notes
- Appointment records
- Prescriptions and medications
- Lab results and imaging studies
- Messages and communications

What will be preserved:
- Anonymized records for legal compliance
- Audit logs (required by healthcare regulations)
- Financial records (required by law)

To confirm this deletion request, visit:
${confirmationUrl}

Deadline: ${deadlineFormatted}
Legal Basis: GDPR Article 17 - Right to Erasure

If you did not request this deletion, please ignore this email or contact our support team immediately at privacy@holilabs.com

---
Holi Labs
Privacy Policy: ${baseUrl}/privacy
Data Protection Officer: dpo@holilabs.com

© ${new Date().getFullYear()} Holi Labs. All rights reserved.
  `;

  // Send email using the unified email service
  try {
    // Queue email for background processing (deletion is critical but not time-sensitive)
    const emailId = await queueEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    console.log('[Deletion Email] Queued for:', email, 'Email ID:', emailId);

    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== DELETION CONFIRMATION EMAIL ===');
      console.log('To:', email);
      console.log('Subject:', emailSubject);
      console.log('Confirmation URL:', confirmationUrl);
      console.log('Email ID:', emailId);
      console.log('===================================\n');
    }
  } catch (error) {
    console.error('[Deletion Email] Failed to queue email:', error);
    throw new Error('Failed to send deletion confirmation email');
  }
}

/**
 * Send deletion completion notification to patient
 * @param email Patient email
 * @param patientName Patient name
 */
export async function sendDeletionCompletedEmail(
  email: string,
  patientName: string
): Promise<void> {
  const emailSubject = 'Your Data Has Been Deleted - Holi Labs';

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Deletion Completed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .success-box {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      border: 1px solid #e0e0e0;
      border-top: none;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Data Deletion Completed</h1>
  </div>

  <div class="content">
    <p>Hello ${patientName},</p>

    <p>Your request to delete your patient data from Holi Labs has been successfully processed.</p>

    <div class="success-box">
      <strong>✓ Completed:</strong> All your personal information and medical records have been permanently deleted from our active systems.
    </div>

    <h3>What was deleted:</h3>
    <ul>
      <li>Personal information (name, contact details, identifiers)</li>
      <li>Medical history and clinical notes</li>
      <li>Appointment records</li>
      <li>Prescriptions and medications</li>
      <li>Lab results and imaging studies</li>
      <li>Messages and communications</li>
    </ul>

    <p><strong>Compliance Notice:</strong></p>
    <p style="font-size: 14px; color: #6c757d;">
      In accordance with GDPR Article 17 and healthcare regulations, we have retained anonymized audit logs for legal compliance. These records contain no personally identifiable information and cannot be used to identify you.
    </p>

    <p style="margin-top: 30px;">
      If you have any questions about this deletion or our data retention policies, please contact our Data Protection Officer at <a href="mailto:dpo@holilabs.com">dpo@holilabs.com</a>
    </p>
  </div>

  <div class="footer">
    <p>This email was sent by Holi Labs<br>
    Privacy Policy: holilabs.com/privacy<br>
    Data Protection Officer: dpo@holilabs.com</p>

    <p style="margin-top: 15px;">
      © ${new Date().getFullYear()} Holi Labs. All rights reserved.<br>
      <small>This is an automated security notice.</small>
    </p>
  </div>
</body>
</html>
  `;

  const emailText = `
Holi Labs - Data Deletion Completed

Hello ${patientName},

Your request to delete your patient data from Holi Labs has been successfully processed.

✓ Completed: All your personal information and medical records have been permanently deleted from our active systems.

What was deleted:
- Personal information (name, contact details, identifiers)
- Medical history and clinical notes
- Appointment records
- Prescriptions and medications
- Lab results and imaging studies
- Messages and communications

Compliance Notice:
In accordance with GDPR Article 17 and healthcare regulations, we have retained anonymized audit logs for legal compliance. These records contain no personally identifiable information and cannot be used to identify you.

If you have any questions about this deletion or our data retention policies, please contact our Data Protection Officer at dpo@holilabs.com

---
Holi Labs
Privacy Policy: holilabs.com/privacy
Data Protection Officer: dpo@holilabs.com

© ${new Date().getFullYear()} Holi Labs. All rights reserved.
  `;

  // Send email using the unified email service
  try {
    // Queue email for background processing
    const emailId = await queueEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    console.log('[Deletion Completed Email] Queued for:', email, 'Email ID:', emailId);

    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== DELETION COMPLETED EMAIL ===');
      console.log('To:', email);
      console.log('Subject:', emailSubject);
      console.log('Email ID:', emailId);
      console.log('===================================\n');
    }
  } catch (error) {
    console.error('[Deletion Completed Email] Failed to queue email:', error);
    throw new Error('Failed to send deletion completion email');
  }
}
