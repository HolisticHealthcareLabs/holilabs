/**
 * QR Code Device Pairing API
 * Handles device pairing requests and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

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

interface PairDeviceResponse {
  success: boolean;
  deviceId?: string;
  sessionToken?: string;
  expiresAt?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PairDeviceResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: PairDeviceRequest = await request.json();
    const { qrPayload, verificationCode } = body;

    // Validate QR payload
    if (!qrPayload || !qrPayload.sessionId || !qrPayload.deviceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid QR payload' },
        { status: 400 }
      );
    }

    // Check expiry
    if (qrPayload.expiresAt <= Date.now()) {
      return NextResponse.json(
        { success: false, error: 'QR code has expired' },
        { status: 400 }
      );
    }

    // Verify user matches
    if (qrPayload.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User mismatch' },
        { status: 403 }
      );
    }

    // Optional: Verify pairing code if provided
    if (verificationCode && verificationCode !== qrPayload.pairingCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Generate session token
    const sessionToken = `${qrPayload.sessionId}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store device pairing in database
    await prisma.devicePairing.create({
      data: {
        userId: session.user.id,
        deviceId: qrPayload.deviceId,
        deviceType: qrPayload.deviceType,
        sessionToken,
        expiresAt: new Date(expiresAt),
      },
    });

    // Log pairing event
    console.log(`Device paired: ${qrPayload.deviceId} for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      deviceId: qrPayload.deviceId,
      sessionToken,
      expiresAt,
    });
  } catch (error) {
    console.error('Device pairing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all paired devices for user
    const devices = await prisma.devicePairing.findMany({
      where: {
        userId: session.user.id,
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
  } catch (error) {
    console.error('Get paired devices error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID required' },
        { status: 400 }
      );
    }

    // Revoke device pairing
    await prisma.devicePairing.deleteMany({
      where: {
        userId: session.user.id,
        deviceId,
      },
    });

    console.log(`Device unpaired: ${deviceId} for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Device unpaired successfully',
    });
  } catch (error) {
    console.error('Device unpairing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
