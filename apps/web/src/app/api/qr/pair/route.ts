/**
 * QR Code Device Pairing API
 * Handles device pairing requests and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface PairDeviceRequest {
  qrPayload: {
    sessionId: string;
    userId: string;
    deviceId: string;
    deviceType: 'DESKTOP' | 'MOBILE_IOS' | 'MOBILE_ANDROID' | 'TABLET';
    pairingCode: string;
    expiresAt: number;
  };
  verificationCode?: string;
}

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body: PairDeviceRequest = await request.json();
    const { qrPayload, verificationCode } = body;
    const userId = context.user!.id;

    if (!qrPayload || !qrPayload.sessionId || !qrPayload.deviceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid QR payload' },
        { status: 400 }
      );
    }

    if (qrPayload.expiresAt <= Date.now()) {
      return NextResponse.json(
        { success: false, error: 'QR code has expired' },
        { status: 400 }
      );
    }

    if (qrPayload.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'User mismatch' },
        { status: 403 }
      );
    }

    if (verificationCode && verificationCode !== qrPayload.pairingCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const sessionToken = `${qrPayload.sessionId}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await prisma.devicePairing.create({
      data: {
        userId,
        deviceId: qrPayload.deviceId,
        deviceType: qrPayload.deviceType,
        sessionToken,
        expiresAt: new Date(expiresAt),
      },
    });

    logger.info('[QR] Device paired', { deviceId: qrPayload.deviceId, userId });

    return NextResponse.json({
      success: true,
      deviceId: qrPayload.deviceId,
      sessionToken,
      expiresAt,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const devices = await prisma.devicePairing.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        isActive: true,
      },
      select: {
        id: true,
        deviceId: true,
        deviceType: true,
        deviceName: true,
        lastSeenAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      devices,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID required' },
        { status: 400 }
      );
    }

    await prisma.devicePairing.deleteMany({
      where: {
        userId,
        deviceId,
      },
    });

    logger.info('[QR] Device unpaired', { deviceId, userId });

    return NextResponse.json({
      success: true,
      message: 'Device unpaired successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
