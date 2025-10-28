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
      subject: '🎉 Bienvenido a Holi Labs BETA - Acceso Inmediato',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a Holi Labs BETA</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 16px; border: 1px solid #38F2AE;">

                    <!-- Header with BETA badge -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <div style="display: inline-block; background: #38F2AE; color: #000; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 20px;">
                          BETA
                        </div>
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #38F2AE 0%, #014751 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                          <span style="color: #fff; font-size: 40px; font-weight: bold; line-height: 80px;">H</span>
                        </div>
                        <h1 style="margin: 0; color: #38F2AE; font-size: 32px; font-weight: bold;">¡Bienvenido a Holi Labs!</h1>
                        <p style="margin: 10px 0 0 0; color: #a0a0a0; font-size: 16px;">Tu acceso BETA está listo</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px 40px;">
                        <p style="margin: 0 0 20px 0; color: #e0e0e0; font-size: 16px; line-height: 24px;">
                          Hola${name ? ` ${name}` : ''},
                        </p>
                        <p style="margin: 0 0 20px 0; color: #e0e0e0; font-size: 16px; line-height: 24px;">
                          ¡Gracias por unirte al programa BETA de Holi Labs! Tu acceso está activo y listo para usar.
                        </p>

                        <!-- Access Card -->
                        <div style="background: #1a1a1a; border: 2px solid #38F2AE; border-radius: 12px; padding: 24px; margin: 30px 0;">
                          <p style="margin: 0 0 16px 0; color: #38F2AE; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                            🔐 TUS CREDENCIALES DE ACCESO
                          </p>
                          <p style="margin: 0 0 12px 0; color: #e0e0e0; font-size: 15px;">
                            <strong style="color: #38F2AE;">Email:</strong> ${email}
                          </p>
                          <p style="margin: 0 0 12px 0; color: #e0e0e0; font-size: 15px;">
                            <strong style="color: #38F2AE;">Modo:</strong> Demo BETA (acceso completo)
                          </p>
                          <p style="margin: 0 0 0 0; color: #e0e0e0; font-size: 15px;">
                            <strong style="color: #38F2AE;">URL:</strong> ${dashboardUrl}
                          </p>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${dashboardUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #38F2AE 0%, #014751 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(56, 242, 174, 0.3);">
                            🚀 Acceder al Dashboard
                          </a>
                        </div>

                        <!-- Features -->
                        <div style="background: #0a0a0a; border-radius: 8px; padding: 20px; margin: 30px 0;">
                          <p style="margin: 0 0 16px 0; color: #38F2AE; font-size: 16px; font-weight: 600;">
                            ✨ Características BETA incluidas:
                          </p>
                          <ul style="margin: 0; padding-left: 20px; color: #c0c0c0; font-size: 14px; line-height: 24px;">
                            <li>Asistente de Voz AI para SOAP notes</li>
                            <li>Generación automática de documentación clínica</li>
                            <li>Portal de pacientes con WhatsApp reminders</li>
                            <li>E-prescripciones digitales</li>
                            <li>Gestión inteligente de citas</li>
                            <li>100% HIPAA/LGPD compliant</li>
                          </ul>
                        </div>

                        <div style="background: #1a1a1a; border-left: 3px solid #38F2AE; border-radius: 4px; padding: 16px; margin: 20px 0;">
                          <p style="margin: 0; color: #c0c0c0; font-size: 14px; line-height: 20px;">
                            💡 <strong style="color: #38F2AE;">Tip:</strong> Estás en modo BETA demo - puedes explorar todas las características sin necesidad de configuración adicional.
                          </p>
                        </div>

                        <p style="margin: 20px 0 0 0; color: #c0c0c0; font-size: 14px; line-height: 20px;">
                          ¿Necesitas ayuda? Responde a este email y nuestro equipo te asistirá.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #0a0a0a; border-radius: 0 0 16px 16px; border-top: 1px solid #2a2a2a;">
                        <p style="margin: 0; color: #38F2AE; font-size: 14px; line-height: 20px; text-align: center;">
                          <strong>Holi Labs</strong> – IA Médica con Privacidad de Primera Clase
                        </p>
                        <p style="margin: 10px 0 0 0; color: #606060; font-size: 12px; text-align: center;">
                          HIPAA | GDPR | LGPD Compliant<br/>
                          © 2025 Holi Labs. Todos los derechos reservados.
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
🎉 Bienvenido a Holi Labs BETA

Hola${name ? ` ${name}` : ''},

¡Gracias por unirte al programa BETA de Holi Labs! Tu acceso está activo y listo para usar.

🔐 TUS CREDENCIALES DE ACCESO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${email}
Modo: Demo BETA (acceso completo)
URL: ${dashboardUrl}

🚀 Acceder ahora:
${dashboardUrl}

✨ Características BETA incluidas:
• Asistente de Voz AI para SOAP notes
• Generación automática de documentación clínica
• Portal de pacientes con WhatsApp reminders
• E-prescripciones digitales
• Gestión inteligente de citas
• 100% HIPAA/LGPD compliant

💡 Tip: Estás en modo BETA demo - puedes explorar todas las características sin necesidad de configuración adicional.

¿Necesitas ayuda? Responde a este email y nuestro equipo te asistirá.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Holi Labs – IA Médica con Privacidad de Primera Clase
HIPAA | GDPR | LGPD Compliant
© 2025 Holi Labs. Todos los derechos reservados.
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
