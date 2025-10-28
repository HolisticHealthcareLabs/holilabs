/**
 * Beta Signup API - Automated Credential Generation
 *
 * When a user signs up for beta:
 * 1. Validates email
 * 2. Sends welcome email with dashboard access link
 * 3. Notifies admin
 */

import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Por favor proporciona un email válido' },
        { status: 400 }
      );
    }

    // Send beta access email with credentials
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.xyz';
    const dashboardUrl = `${appUrl}/dashboard`;

    const result = await sendEmail({
      to: email,
      subject: '🎉 Welcome to Holi Labs BETA - Instant Access',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Holi Labs BETA</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 16px; border: 2px solid #10b981;">

                    <!-- Header with BETA badge -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; padding: 8px 20px; border-radius: 24px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 24px;">
                          BETA ACCESS
                        </div>
                        <h1 style="margin: 0; color: #111827; font-size: 36px; font-weight: 800;">Welcome to Holi Labs!</h1>
                        <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 18px;">Your BETA access is ready</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px 40px;">
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 26px;">
                          Hi${name ? ` ${name}` : ''},
                        </p>
                        <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 26px;">
                          Thank you for joining the Holi Labs BETA program! Your access is active and ready to use—no password needed.
                        </p>

                        <!-- Access Card -->
                        <div style="background: #f9fafb; border: 2px solid #10b981; border-radius: 12px; padding: 28px; margin: 32px 0;">
                          <p style="margin: 0 0 18px 0; color: #059669; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                            🔐 YOUR ACCESS CREDENTIALS
                          </p>
                          <p style="margin: 0 0 14px 0; color: #111827; font-size: 16px;">
                            <strong style="color: #059669;">Email:</strong> ${email}
                          </p>
                          <p style="margin: 0 0 14px 0; color: #111827; font-size: 16px;">
                            <strong style="color: #059669;">Access:</strong> Full BETA Demo Mode
                          </p>
                          <p style="margin: 0 0 0 0; color: #111827; font-size: 16px;">
                            <strong style="color: #059669;">Dashboard:</strong> <a href="${dashboardUrl}" style="color: #2563eb; text-decoration: underline;">${dashboardUrl}</a>
                          </p>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 36px 0;">
                          <a href="${dashboardUrl}" style="display: inline-block; padding: 18px 56px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);">
                            🚀 Access Dashboard Now
                          </a>
                        </div>

                        <!-- Features -->
                        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 32px 0;">
                          <p style="margin: 0 0 18px 0; color: #059669; font-size: 18px; font-weight: 700;">
                            ✨ BETA Features Included:
                          </p>
                          <ul style="margin: 0; padding-left: 24px; color: #4b5563; font-size: 15px; line-height: 28px;">
                            <li><strong>AI Voice Assistant</strong> for automated SOAP notes</li>
                            <li><strong>Clinical Documentation</strong> auto-generation</li>
                            <li><strong>Patient Portal</strong> with WhatsApp reminders</li>
                            <li><strong>Digital E-Prescriptions</strong></li>
                            <li><strong>Intelligent Appointment Management</strong></li>
                            <li><strong>100% HIPAA, GDPR & LGPD Compliant</strong></li>
                          </ul>
                        </div>

                        <div style="background: #dbeafe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 20px; margin: 24px 0;">
                          <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 24px;">
                            💡 <strong>Quick Tip:</strong> You're in BETA demo mode—explore all features without any additional setup. Just click and start!
                          </p>
                        </div>

                        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 15px; line-height: 24px;">
                          Need help? Reply to this email and our team will assist you within 24 hours.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 2px solid #e5e7eb;">
                        <p style="margin: 0; color: #059669; font-size: 16px; line-height: 24px; text-align: center; font-weight: 700;">
                          Holi Labs – Privacy-First Medical AI
                        </p>
                        <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
                          HIPAA | GDPR | LGPD Compliant<br/>
                          © 2025 Holi Labs. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `
🎉 Welcome to Holi Labs BETA

Hi${name ? ` ${name}` : ''},

Thank you for joining the Holi Labs BETA program! Your access is active and ready to use—no password needed.

🔐 YOUR ACCESS CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${email}
Access: Full BETA Demo Mode
Dashboard: ${dashboardUrl}

🚀 Access Now:
${dashboardUrl}

✨ BETA Features Included:
• AI Voice Assistant for automated SOAP notes
• Clinical Documentation auto-generation
• Patient Portal with WhatsApp reminders
• Digital E-Prescriptions
• Intelligent Appointment Management
• 100% HIPAA, GDPR & LGPD Compliant

💡 Quick Tip: You're in BETA demo mode—explore all features without any additional setup. Just click and start!

Need help? Reply to this email and our team will assist you within 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Holi Labs – Privacy-First Medical AI
HIPAA | GDPR | LGPD Compliant
© 2025 Holi Labs. All rights reserved.
      `,
      tags: [
        { name: 'type', value: 'beta_signup' },
        { name: 'category', value: 'onboarding' },
      ],
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Send notification to admin
    await sendEmail({
      to: 'nicolacapriroloteran@gmail.com',
      subject: `🎯 Nuevo Beta Signup: ${name || email}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: linear-gradient(135deg, #38F2AE 0%, #014751 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0; font-size: 24px;">🎯 Nuevo Beta Signup</h2>
          </div>

          <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>Email:</strong> ${email}</p>
            ${name ? `<p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>Nombre:</strong> ${name}</p>` : ''}
            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>Registrado:</strong> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' })}</p>
            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;"><strong>Dashboard URL:</strong> <a href="${dashboardUrl}" style="color: #38F2AE;">${dashboardUrl}</a></p>
          </div>

          <div style="background: #e0f2f1; border-left: 4px solid #38F2AE; border-radius: 4px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #014751; font-size: 14px;">
              ✅ Email de acceso enviado automáticamente con credenciales de demo.
            </p>
          </div>
        </div>
      `,
    });

    logger.info({
      event: 'beta_signup_success',
      email,
      name,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: '¡Perfecto! Revisa tu email para acceder inmediatamente a Holi Labs BETA.',
    });
  } catch (error: any) {
    logger.error({
      event: 'beta_signup_error',
      error: error.message,
    });

    console.error('Beta signup error:', error);
    return NextResponse.json(
      { error: 'Error al procesar tu registro. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}
