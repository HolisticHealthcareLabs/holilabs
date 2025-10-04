import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { email, name, organization, role } = await request.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!resend) {
      console.error('Resend API key not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Send confirmation email to the user
    await resend.emails.send({
      from: 'Holi Labs <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to Holi Labs Beta! 🚀',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Holi Labs</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 0 40px; text-align: center;">
                        <div style="width: 60px; height: 60px; background-color: #38F2AE; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                          <span style="color: #014751; font-size: 32px; font-weight: bold; line-height: 60px;">H</span>
                        </div>
                        <h1 style="margin: 0; color: #014751; font-size: 28px; font-weight: bold;">Welcome to Holi Labs Beta</h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 30px 40px;">
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                          Hi${name ? ` ${name}` : ''},
                        </p>
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                          Thank you for joining the Holi Labs Beta waitlist! We're building the future of healthcare AI with privacy at its core.
                        </p>
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                          <strong style="color: #014751;">What's next:</strong>
                        </p>
                        <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #374151; font-size: 16px; line-height: 24px;">
                          <li style="margin-bottom: 10px;">You'll receive early access to our platform</li>
                          <li style="margin-bottom: 10px;">Get exclusive insights into HIPAA-compliant AI</li>
                          <li style="margin-bottom: 10px;">Be the first to try de-identification & differential privacy features</li>
                        </ul>
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 24px;">
                          We'll reach out soon with your beta access credentials.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="https://holilabs-lwp6y.ondigitalocean.app" style="display: inline-block; padding: 14px 28px; background-color: #014751; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Visit Holi Labs</a>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 20px; text-align: center;">
                          <strong>Holi Labs</strong> – HIPAA/GDPR/LGPD Compliant Healthcare AI
                        </p>
                        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
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
    });

    // Send notification to admin
    await resend.emails.send({
      from: 'Holi Labs Waitlist <onboarding@resend.dev>',
      to: 'nicolacapriroloteran@gmail.com', // Replace with your admin email
      subject: `New Beta Signup: ${name || email}`,
      html: `
        <h2>New Beta Waitlist Signup</h2>
        <p><strong>Email:</strong> ${email}</p>
        ${name ? `<p><strong>Name:</strong> ${name}</p>` : ''}
        ${organization ? `<p><strong>Organization:</strong> ${organization}</p>` : ''}
        ${role ? `<p><strong>Role:</strong> ${role}</p>` : ''}
        <p><strong>Signed up:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
    });
  } catch (error: any) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    );
  }
}
