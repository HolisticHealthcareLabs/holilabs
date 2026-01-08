/**
 * Email Queue Usage Examples
 *
 * This file demonstrates how to use the production email queue system.
 * Copy these examples into your actual application code.
 *
 * @module email/example-usage
 */

import { queueEmail, startEmailWorker, getEmailQueueMetrics, getEmailJobStatus } from './email-queue';

/**
 * Example 1: Start the email worker
 *
 * Call this once when your application starts (e.g., in server initialization)
 */
export function initializeEmailWorker() {
  console.log('Starting email worker...');

  const worker = startEmailWorker();

  console.log('Email worker started and processing jobs');

  return worker;
}

/**
 * Example 2: Send a simple email
 */
export async function sendWelcomeEmail(
  patientEmail: string,
  patientName: string
) {
  const jobId = await queueEmail({
    to: patientEmail,
    subject: 'Welcome to Holi Labs',
    html: `
      <h1>Welcome ${patientName}!</h1>
      <p>Thank you for joining Holi Labs. We're excited to help you on your health journey.</p>
    `,
    text: `Welcome ${patientName}! Thank you for joining Holi Labs.`,
    priority: 'high',
    metadata: {
      type: 'welcome',
      patientName,
    },
  });

  console.log('Welcome email queued:', jobId);
  return jobId;
}

/**
 * Example 3: Send appointment reminder with high priority
 */
export async function sendAppointmentReminder(
  patientEmail: string,
  appointmentDetails: {
    patientName: string;
    clinicianName: string;
    date: string;
    time: string;
    appointmentId: string;
  }
) {
  const { patientName, clinicianName, date, time, appointmentId } = appointmentDetails;

  const jobId = await queueEmail({
    to: patientEmail,
    subject: `Appointment Reminder - ${date} at ${time}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Appointment Reminder</h2>
        <p>Hello ${patientName},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        <ul>
          <li><strong>Provider:</strong> ${clinicianName}</li>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Time:</strong> ${time}</li>
        </ul>
        <p>Please arrive 10 minutes early.</p>
      </div>
    `,
    text: `Hello ${patientName}, this is a reminder about your appointment with ${clinicianName} on ${date} at ${time}. Please arrive 10 minutes early.`,
    priority: 'high',
    metadata: {
      type: 'appointment_reminder',
      appointmentId,
    },
  });

  return jobId;
}

/**
 * Example 4: Send bulk emails (newsletter)
 */
export async function sendNewsletterToPatients(
  patients: Array<{ email: string; name: string; id: string }>
) {
  console.log(`Sending newsletter to ${patients.length} patients...`);

  const jobIds = await Promise.all(
    patients.map((patient) =>
      queueEmail({
        to: patient.email,
        subject: 'Monthly Health Tips from Holi Labs',
        html: generateNewsletterHTML(patient.name),
        text: generateNewsletterText(patient.name),
        priority: 'low', // Low priority for bulk emails
        metadata: {
          type: 'newsletter',
          patientId: patient.id,
          campaignId: 'monthly-2025-01',
        },
      })
    )
  );

  console.log(`Queued ${jobIds.length} newsletter emails`);
  return jobIds;
}

/**
 * Example 5: Send email with CC and BCC
 */
export async function sendLabResultsNotification(
  patientEmail: string,
  clinicianEmail: string,
  adminEmail: string,
  labDetails: {
    patientName: string;
    testName: string;
    resultUrl: string;
  }
) {
  const jobId = await queueEmail({
    to: patientEmail,
    cc: [clinicianEmail], // Clinician gets a copy
    bcc: [adminEmail], // Admin gets a blind copy
    subject: `Lab Results Available: ${labDetails.testName}`,
    html: `
      <h2>Lab Results Available</h2>
      <p>Hello ${labDetails.patientName},</p>
      <p>Your lab results for ${labDetails.testName} are now available.</p>
      <p><a href="${labDetails.resultUrl}">View Your Results</a></p>
    `,
    priority: 'high',
    metadata: {
      type: 'lab_results',
      testName: labDetails.testName,
    },
  });

  return jobId;
}

/**
 * Example 6: Track email status
 */
export async function checkEmailStatus(jobId: string) {
  const status = await getEmailJobStatus(jobId);

  if (!status) {
    console.log('Job not found');
    return null;
  }

  console.log('Email Status:', {
    state: status.state,
    attempts: status.attemptsMade,
    failedReason: status.failedReason,
  });

  return status;
}

/**
 * Example 7: Monitor queue health
 */
export async function monitorEmailQueue() {
  const metrics = await getEmailQueueMetrics();

  console.log('Email Queue Metrics:', {
    waiting: metrics.waiting,
    active: metrics.active,
    completed: metrics.completed,
    failed: metrics.failed,
    total: metrics.total,
  });

  // Alert if too many failed
  if (metrics.failed > 100) {
    console.error('⚠️ High failure rate in email queue!');
    // Send alert to monitoring system
  }

  // Alert if queue is backed up
  if (metrics.waiting > 1000) {
    console.warn('⚠️ Email queue is backing up!');
    // Consider scaling workers
  }

  return metrics;
}

/**
 * Example 8: Send email with reply-to
 */
export async function sendSupportEmail(
  patientEmail: string,
  patientName: string,
  message: string
) {
  const jobId = await queueEmail({
    to: patientEmail,
    subject: 'Response from Holi Labs Support',
    html: `
      <p>Hello ${patientName},</p>
      <p>${message}</p>
      <p>If you have any questions, please reply to this email.</p>
    `,
    replyTo: 'support@holilabs.com',
    priority: 'normal',
    metadata: {
      type: 'support_response',
    },
  });

  return jobId;
}

// Helper functions

function generateNewsletterHTML(patientName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Monthly Health Tips</h1>
      <p>Hello ${patientName},</p>

      <h2>This Month's Tips</h2>
      <ul>
        <li>Stay hydrated - drink at least 8 glasses of water daily</li>
        <li>Get 7-9 hours of sleep each night</li>
        <li>Take a 10-minute walk after meals</li>
      </ul>

      <p>Stay healthy!</p>
      <p>- The Holi Labs Team</p>
    </div>
  `;
}

function generateNewsletterText(patientName: string): string {
  return `
Monthly Health Tips

Hello ${patientName},

This Month's Tips:
- Stay hydrated - drink at least 8 glasses of water daily
- Get 7-9 hours of sleep each night
- Take a 10-minute walk after meals

Stay healthy!
- The Holi Labs Team
  `.trim();
}

/**
 * Example 9: API Route Integration (Next.js)
 *
 * Usage in app/api/email/send/route.ts:
 *
 * ```typescript
 * import { queueEmail } from '@/lib/email/email-queue';
 *
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *
 *   const jobId = await queueEmail({
 *     to: body.to,
 *     subject: body.subject,
 *     html: body.html,
 *     priority: 'normal',
 *   });
 *
 *   return Response.json({ success: true, jobId });
 * }
 * ```
 */

/**
 * Example 10: Scheduled Task Integration
 *
 * Usage with node-cron:
 *
 * ```typescript
 * import cron from 'node-cron';
 * import { queueEmail } from '@/lib/email/email-queue';
 *
 * // Send daily summary at 8 AM
 * cron.schedule('0 8 * * *', async () => {
 *   const patients = await getPatientsWithAppointmentsToday();
 *
 *   for (const patient of patients) {
 *     await queueEmail({
 *       to: patient.email,
 *       subject: 'Your appointments today',
 *       html: generateDailySummaryHTML(patient),
 *       priority: 'high',
 *     });
 *   }
 * });
 * ```
 */
