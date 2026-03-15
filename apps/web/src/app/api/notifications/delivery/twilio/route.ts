/**
 * Twilio Delivery Status Webhook
 *
 * POST /api/notifications/delivery/twilio — receives SMS/WhatsApp delivery status callbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';

export const POST = createPublicRoute(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const to = formData.get('To') as string;
    const errorCode = formData.get('ErrorCode') as string | null;

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
