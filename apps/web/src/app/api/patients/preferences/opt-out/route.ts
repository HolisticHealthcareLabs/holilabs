/**
 * Public Opt-Out API
 * TCPA & CAN-SPAM Compliant One-Click Unsubscribe
 *
 * GET /api/patients/preferences/opt-out?token=xxx&type=sms|email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Simple token encryption/decryption
// In production, use a more robust encryption method
const SECRET_KEY = process.env.OPT_OUT_SECRET_KEY || 'default-secret-key-change-me';

function decryptToken(token: string): string | null {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(SECRET_KEY).digest(),
      Buffer.alloc(16, 0) // IV should be stored with token in production
    );
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

// ============================================================================
// GET /api/patients/preferences/opt-out
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const type = searchParams.get('type'); // 'sms', 'email', 'all'

  // Validate parameters
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing token parameter',
      },
      { status: 400 }
    );
  }

  if (!type || !['sms', 'email', 'all'].includes(type)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid type parameter. Must be: sms, email, or all',
      },
      { status: 400 }
    );
  }

  // Decrypt token to get patient ID
  const patientId = decryptToken(token);
  if (!patientId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid or expired token',
      },
      { status: 400 }
    );
  }

  // Check if patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!patient) {
    return NextResponse.json(
      {
        success: false,
        error: 'Patient not found',
      },
      { status: 404 }
    );
  }

  // Get IP address for audit trail
  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Prepare update data based on opt-out type
  const updateData: any = {};
  const now = new Date();

  if (type === 'sms' || type === 'all') {
    updateData.smsEnabled = false;
    updateData.smsAppointments = false;
    updateData.smsPrescriptions = false;
    updateData.smsResults = false;
    updateData.smsReminders = false;
    updateData.smsMarketing = false;
    updateData.smsOptedOutAt = now;
  }

  if (type === 'email' || type === 'all') {
    updateData.emailEnabled = false;
    updateData.emailAppointments = false;
    updateData.emailPrescriptions = false;
    updateData.emailResults = false;
    updateData.emailReminders = false;
    updateData.emailMarketing = false;
    updateData.emailOptedOutAt = now;
  }

  // Upsert preferences with opt-out
  await prisma.patientPreferences.upsert({
    where: { patientId },
    update: updateData,
    create: {
      patientId,
      ...updateData,
    },
  });

  // Log the opt-out in audit trail
  await prisma.auditLog.create({
    data: {
      userId: patientId,
      action: 'OPT_OUT',
      resource: 'PatientPreferences',
      resourceId: patientId,
      changes: { type, ipAddress },
      ipAddress,
      userAgent: request.headers.get('user-agent') || 'unknown',
    },
  });

  // Return success HTML page (user-friendly)
  const patientName = `${patient.firstName} ${patient.lastName}`;
  const typeDisplay = type === 'all' ? 'todas las comunicaciones' : type === 'sms' ? 'mensajes SMS' : 'correos electrónicos';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preferencias Actualizadas - HoliLabs</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    h1 {
      color: #1a202c;
      font-size: 24px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    p {
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .info {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 24px 0;
      text-align: left;
      border-radius: 4px;
    }
    .info strong {
      color: #2d3748;
      display: block;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #718096;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Preferencias Actualizadas</h1>
    <p>Hola <strong>${patientName}</strong>,</p>
    <p>Tus preferencias de comunicación han sido actualizadas exitosamente.</p>

    <div class="info">
      <strong>Cambios aplicados:</strong>
      <p>Has optado por no recibir ${typeDisplay}.</p>
      <p style="margin-top: 12px; color: #718096; font-size: 14px;">
        Fecha: ${now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
      </p>
    </div>

    <p style="font-size: 14px;">
      Puedes actualizar tus preferencias en cualquier momento desde tu portal de paciente o contactando a tu clínica.
    </p>

    <div class="footer">
      <p>© 2025 HoliLabs Health AI</p>
      <p style="margin-top: 8px;">
        <a href="https://holilabs.com">holilabs.com</a> •
        <a href="mailto:support@holilabs.com">support@holilabs.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
