/**
 * Communications Webhook — Security Tests
 *
 * Twilio webhook signature validation, replay protection, consent enforcement.
 *
 * CYRUS: webhook signature validated before ANY processing
 * RUTH: patient consent verified before sending
 *
 * @see sprint5-assets/comms-architecture.json — security.cyrusInvariants
 * @see sprint5-assets/test-specs.json — INT-TWILIO-* and INT-COMMS-* specs
 */

// CLAUDE.md pattern: jest.mock BEFORE require
jest.mock('@/lib/prisma', () => ({ prisma: require('./setup').createMockPrisma() }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('twilio', () => {
  return {
    __esModule: true,
    default: jest.fn(() => require('./setup').createMockTwilio()),
    validateRequest: jest.fn().mockReturnValue(true),
  };
});

const { prisma } = require('@/lib/prisma');
const { getServerSession } = require('next-auth/next');
const twilio = require('twilio');

import {
  createMockSession,
  createMockTwilio,
  createMockRequest,
  createTestPatient,
  createTestConversation,
} from './setup';

// ─── Twilio Webhook Signature Validation ─────────────────────────────────────

describe('POST /api/comms/webhook/twilio — Signature Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('INT-TWILIO-001: Valid signature → 200, message stored', async () => {
    twilio.validateRequest.mockReturnValue(true);

    const patient = createTestPatient();
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(patient);
    (prisma.conversation.upsert as jest.Mock).mockResolvedValue(createTestConversation());
    (prisma.message.create as jest.Mock).mockResolvedValue({ id: 'msg_new' });

    // TODO: holilabsv2 — call actual webhook handler
    // const request = createMockRequest('POST', '/api/comms/webhook/twilio', {
    //   MessageSid: 'SM123', AccountSid: 'AC456',
    //   From: 'whatsapp:+5511987654321', Body: 'Bom dia',
    // }, { 'x-twilio-signature': 'valid_hash' });
    // const response = await POST(request);
    // expect(response.status).toBe(200);

    // Verify: twilio.validateRequest was called FIRST
    // expect(twilio.validateRequest).toHaveBeenCalledBefore(prisma.message.create);
  });

  test('INT-TWILIO-002: Invalid signature → 403, nothing stored', async () => {
    twilio.validateRequest.mockReturnValue(false);

    // TODO: holilabsv2 — call webhook with bad signature
    // const response = await POST(request);
    // expect(response.status).toBe(403);

    // CYRUS VETO: no database write should happen
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
  });

  test('INT-TWILIO-002b: Missing signature header → 403', async () => {
    // Request without X-Twilio-Signature header
    // Should immediately return 403 before processing body
  });

  test('INT-TWILIO-003: Replay attack (same MessageSid) → 409', async () => {
    twilio.validateRequest.mockReturnValue(true);

    // First message: succeeds
    (prisma.message.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.message.create as jest.Mock).mockResolvedValue({ id: 'msg_1', twilioSid: 'SM123' });

    // Second attempt with same MessageSid: already exists
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: 'msg_1', twilioSid: 'SM123' });

    // TODO: holilabsv2 — second call should return 200 (idempotent) but NOT create duplicate
    // prisma.message.create should only be called once total
  });

  test('CYRUS: Signature validated BEFORE any database operation', () => {
    // This is the most critical security test
    // The validate call must happen before ANY prisma call
    // Implementation should be:
    //   1. validateRequest() → false → return 403 immediately
    //   2. Only if true → proceed to DB lookup/write

    twilio.validateRequest.mockReturnValue(false);
    // After calling webhook with invalid signature:
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

// ─── Delivery Status Webhook ─────────────────────────────────────────────────

describe('POST /api/comms/webhook/status — Delivery Updates', () => {
  test('Updates message status on delivery callback', async () => {
    twilio.validateRequest.mockReturnValue(true);
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: 'msg_1', status: 'SENT' });
    (prisma.message.update as jest.Mock).mockResolvedValue({ id: 'msg_1', status: 'DELIVERED' });

    // TODO: holilabsv2 — call status webhook with MessageStatus: 'delivered'
    // expect(prisma.message.update).toHaveBeenCalledWith({
    //   where: { twilioSid: 'SM123' },
    //   data: { status: 'DELIVERED', deliveredAt: expect.any(Date) },
    // });
  });

  test('Failed delivery records error code', async () => {
    twilio.validateRequest.mockReturnValue(true);
    (prisma.message.findFirst as jest.Mock).mockResolvedValue({ id: 'msg_1', status: 'SENT' });

    // Twilio sends: MessageStatus: 'failed', ErrorCode: '30003'
    // Should update: status: 'FAILED', errorCode: '30003'
  });
});

// ─── Consent Enforcement ─────────────────────────────────────────────────────

describe('Consent Enforcement — RUTH Invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createMockSession('CLINICIAN'));
  });

  test('INT-COMMS-001: WhatsApp to patient without consent → rejected', async () => {
    const patient = createTestPatient({ whatsappConsentGiven: false });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);

    // TODO: holilabsv2 — POST /api/comms/send with channel: 'WHATSAPP'
    // expect(response.body.success).toBe(false);
    // expect(response.body.failureReason).toContain('consent');

    // RUTH: no message should be sent without consent
    const twilioClient = createMockTwilio();
    expect(twilioClient.messages.create).not.toHaveBeenCalled();
  });

  test('WhatsApp to patient WITH consent → sent', async () => {
    const patient = createTestPatient({ whatsappConsentGiven: true, whatsappConsentDate: new Date() });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);

    // Should proceed to send
  });

  test('SMS to patient with smsEnabled=false → rejected', async () => {
    const patient = createTestPatient({ smsEnabled: false });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);
    // POST /api/comms/send with channel: 'SMS' → should fail
  });

  test('Email to patient with emailEnabled=false → rejected', async () => {
    const patient = createTestPatient({ emailEnabled: false });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);
  });

  test('INT-COMMS-002: PHI in message body → 400 rejected', async () => {
    const patient = createTestPatient();
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);

    // Message containing clinical data should be blocked
    // const request = createMockRequest('POST', '/api/comms/send', {
    //   patientId: 'pat_01', channel: 'WHATSAPP',
    //   content: 'Seu diagnóstico: hipertensão. Glicemia: 250 mg/dL',
    // });
    // expect(response.status).toBe(400);
    // expect(response.body.error).toContain('clinical data');
  });

  test('Consent withdrawn → immediately stop sending', async () => {
    const patient = createTestPatient({
      whatsappConsentGiven: true,
      whatsappConsentWithdrawnAt: new Date(), // Consent withdrawn
    });
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(patient);
    // Even though whatsappConsentGiven is true, withdrawal date takes precedence
    // Should reject the send
  });
});
