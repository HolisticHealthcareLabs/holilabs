/**
 * Twilio Delivery Status Webhook
 *
 * POST /api/notifications/delivery/twilio — receives SMS/WhatsApp delivery status callbacks
 *
 * CYRUS: Validates X-Twilio-Signature header using HMAC-SHA1 before processing.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';

/**
 * Verify Twilio webhook signature (HMAC-SHA1).
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], '');
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const POST = createPublicRoute(async (request: NextRequest) => {
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (!twilioAuthToken) {
    logger.error({ event: 'twilio_webhook_no_auth_token' });
    return new NextResponse('', { status: 500 });
  }

  const twilioSignature = request.headers.get('x-twilio-signature');
  if (!twilioSignature) {
    logger.warn({ event: 'twilio_webhook_missing_signature' });
    return new NextResponse('', { status: 403 });
  }

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    // CYRUS: validate signature before processing any data
    const requestUrl =
      (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') +
      '/api/notifications/delivery/twilio';

    if (!validateTwilioSignature(twilioAuthToken, twilioSignature, requestUrl, params)) {
      logger.warn({ event: 'twilio_webhook_invalid_signature' });
      return new NextResponse('', { status: 403 });
    }

    const messageSid = params['MessageSid'];
    const messageStatus = params['MessageStatus'];
    const to = params['To'];
    const errorCode = params['ErrorCode'] || null;

    logger.info({
      event: 'twilio_delivery_status',
      messageSid,
      status: messageStatus,
      to,
      errorCode,
    });

    return new NextResponse('', { status: 204 });
  } catch (error) {
    logger.error({
      event: 'twilio_webhook_error',
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return new NextResponse('', { status: 200 });
  }
});
