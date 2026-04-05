/**
 * Twilio Send — Outbound message dispatch (WhatsApp/SMS/Email)
 *
 * Reference for src/app/api/comms/send/route.ts
 *
 * RUTH: consent check before sending, PHI filter on outbound content
 * CYRUS: createProtectedRoute, audit trail, encrypted content
 *
 * @see sprint5-assets/comms-architecture.json — twilio.whatsapp.messageTypes
 * @see sprint5-assets/comms-hub-templates.json — HSM templates
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: holilabsv2 — import from your actual paths
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { encryptPHIWithVersion } from '@/lib/encryption';
// import { emitDeliveryUpdate } from '@/lib/events/emit';
// import twilio from 'twilio';

// ─── PHI Content Filter (RUTH invariant) ─────────────────────────────────────

const PHI_PATTERNS = [
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,        // CPF: 123.456.789-09
  /\b\d{11}\b/g,                              // CPF without dots: 12345678909
  /\b\d{15}\b/g,                              // CNS: 700501234567890
  /\b(diagnóstic|resultado|glicemia|pressão|colesterol|hemoglobina|troponina|hba1c|creatinina)\b/gi,
  /\b(diagnos|result|glucose|cholesterol|hemoglobin|troponin|creatinine)\b/gi,
  /\b(CID|ICD)-?\d{1,2}[\.\s]?\w{0,4}\b/gi, // ICD-10 codes
];

function containsPHI(content: string): boolean {
  return PHI_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(content);
  });
}

function stripPHI(content: string): string {
  let cleaned = content;
  cleaned = cleaned.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF]');
  cleaned = cleaned.replace(/\b\d{15}\b/g, '[CNS]');
  return cleaned;
}

// ─── Consent Check (RUTH invariant) ──────────────────────────────────────────

interface ConsentCheckResult {
  allowed: boolean;
  reason?: string;
}

function checkConsent(
  patient: { whatsappConsentGiven?: boolean; whatsappConsentWithdrawnAt?: Date | null; smsEnabled?: boolean; emailEnabled?: boolean },
  channel: string
): ConsentCheckResult {
  switch (channel) {
    case 'WHATSAPP':
      if (!patient.whatsappConsentGiven) return { allowed: false, reason: 'Patient has not granted WhatsApp consent' };
      if (patient.whatsappConsentWithdrawnAt) return { allowed: false, reason: 'Patient withdrew WhatsApp consent' };
      return { allowed: true };
    case 'SMS':
      if (!patient.smsEnabled) return { allowed: false, reason: 'Patient has not enabled SMS' };
      return { allowed: true };
    case 'EMAIL':
      if (!patient.emailEnabled) return { allowed: false, reason: 'Patient has not enabled email' };
      return { allowed: true };
    case 'IN_APP':
      return { allowed: true }; // In-app always allowed
    default:
      return { allowed: false, reason: `Unknown channel: ${channel}` };
  }
}

// ─── Template Handling ───────────────────────────────────────────────────────

interface TemplateResult {
  body: string;
  contentSid?: string;
}

function resolveTemplate(
  templateId: string,
  variables: Record<string, string>,
  locale: string = 'pt-BR'
): TemplateResult | null {
  // TODO: holilabsv2 — load from comms-hub-templates.json or database
  // For now, simple variable substitution
  // const template = templates.find(t => t.id === templateId);
  // if (!template) return null;
  // let body = template.locales[locale]?.body || template.locales['en']?.body;
  // for (const [key, value] of Object.entries(variables)) {
  //   body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  // }
  // return { body, contentSid: template.contentSid };
  return null; // Scaffold placeholder
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // ── Auth (CYRUS: createProtectedRoute) ─────────────────────────────────
  // TODO: holilabsv2 — uncomment
  // const session = await getServerSession(authOptions);
  // if (!session?.user || !['CLINICIAN', 'ORG_ADMIN'].includes(session.user.role)) {
  //   return NextResponse.json({ error: 'E-3002', message: 'Unauthorized' }, { status: 403 });
  // }

  const body = await request.json();
  const { conversationId, patientId, content, channel, templateId, templateVariables } = body as {
    conversationId?: string;
    patientId: string;
    content?: string;
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'IN_APP';
    templateId?: string;
    templateVariables?: Record<string, string>;
  };

  // ── Load patient ───────────────────────────────────────────────────────
  // TODO: holilabsv2 — const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  const patient = { id: patientId, phone: '+5511987654321', whatsappConsentGiven: true, whatsappConsentWithdrawnAt: null, smsEnabled: true, emailEnabled: true, organizationId: 'org_holilabs_demo', firstName: 'João', lastName: 'Silva' };

  if (!patient) {
    return NextResponse.json({ error: 'E-4005', message: 'Patient not found' }, { status: 404 });
  }

  // ── RUTH: Consent check ────────────────────────────────────────────────
  const consent = checkConsent(patient, channel);
  if (!consent.allowed) {
    return NextResponse.json({
      success: false,
      error: 'E-2001',
      message: consent.reason,
      consentVerified: false,
    }, { status: 403 });
  }

  // ── Resolve message content ────────────────────────────────────────────
  let messageBody: string;
  if (templateId && templateVariables) {
    const resolved = resolveTemplate(templateId, templateVariables);
    if (!resolved) {
      return NextResponse.json({ error: 'E-4004', message: `Template ${templateId} not found` }, { status: 400 });
    }
    messageBody = resolved.body;
  } else if (content) {
    messageBody = content;
  } else {
    return NextResponse.json({ error: 'E-4002', message: 'content or templateId required' }, { status: 400 });
  }

  // ── RUTH: PHI content filter ───────────────────────────────────────────
  if (containsPHI(messageBody)) {
    return NextResponse.json({
      success: false,
      error: 'E-2002',
      message: 'Message content must not contain clinical data (diagnoses, lab values, CPF, CNS). Use secure portal links instead.',
    }, { status: 400 });
  }

  // ── Feature flag: mock mode ────────────────────────────────────────────
  const twilioEnabled = process.env.TWILIO_ENABLED !== 'false';
  let twilioSid: string | null = null;
  let sendStatus: 'QUEUED' | 'SENT' | 'FAILED' = 'QUEUED';

  if (twilioEnabled) {
    try {
      // TODO: holilabsv2 — actual Twilio send
      // const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // const twilioMessage = await twilioClient.messages.create({
      //   to: channel === 'WHATSAPP' ? `whatsapp:${patient.phone}` : patient.phone,
      //   from: channel === 'WHATSAPP' ? process.env.TWILIO_WHATSAPP_NUMBER : process.env.TWILIO_SMS_NUMBER,
      //   body: messageBody,
      //   statusCallback: `${process.env.TWILIO_WEBHOOK_URL}/status`,
      // });
      // twilioSid = twilioMessage.sid;
      twilioSid = `SM_mock_${Date.now()}`; // Scaffold placeholder
      sendStatus = 'SENT';
    } catch (err) {
      console.error('[Send] Twilio error:', err);
      sendStatus = 'FAILED';
    }
  } else {
    // Mock mode: skip Twilio, mark as SENT
    twilioSid = `SM_mock_${Date.now()}`;
    sendStatus = 'SENT';
  }

  // ── Store message (CYRUS: encrypt content) ─────────────────────────────
  // TODO: holilabsv2 — const encryptedContent = encryptPHIWithVersion(messageBody);
  // const message = await prisma.message.create({
  //   data: {
  //     conversationId, direction: 'OUTBOUND', channelType: channel,
  //     content: encryptedContent, contentType: templateId ? 'TEMPLATE' : 'TEXT',
  //     templateId, status: sendStatus, twilioSid,
  //     sentById: session.user.id,
  //   },
  // });

  const messageId = `msg_${Date.now()}`; // Scaffold placeholder

  // ── Emit SSE event ─────────────────────────────────────────────────────
  // TODO: holilabsv2 — emitDeliveryUpdate(patient.organizationId, {
  //   messageId, conversationId: conversationId || '', status: sendStatus,
  // });

  // ── Audit ──────────────────────────────────────────────────────────────
  // TODO: holilabsv2 — prisma.auditLog.create({ ... });

  return NextResponse.json({
    success: sendStatus !== 'FAILED',
    messageId,
    channel,
    status: sendStatus,
    twilioSid,
    consentVerified: true,
  });
}
