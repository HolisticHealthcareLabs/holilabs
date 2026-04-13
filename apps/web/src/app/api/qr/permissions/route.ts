export const dynamic = "force-dynamic";
/**
 * Permission Management API
 * Handles permission grants, revocations, and queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import type { PermissionScope } from '@/lib/qr/types';
import logger from '@/lib/logger';

interface GrantPermissionsRequest {
  deviceId: string;
  permissions: PermissionScope[];
}

interface UpdatePermissionsRequest {
  deviceId: string;
  permissions: PermissionScope[];
}

const VALID_PERMISSIONS: PermissionScope[] = [
  'READ_PATIENT_DATA',
  'WRITE_NOTES',
  'VIEW_TRANSCRIPT',
  'CONTROL_RECORDING',
  'ACCESS_DIAGNOSIS',
  'VIEW_MEDICATIONS',
  'EDIT_SOAP_NOTES',
  'FULL_ACCESS',
];

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body: GrantPermissionsRequest = await request.json();
    const { deviceId, permissions } = body;
    const userId = context.user!.id;

    if (!deviceId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const invalidPerms = permissions.filter((p) => !VALID_PERMISSIONS.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid permissions: ${invalidPerms.join(', ')}` },
        { status: 400 }
      );
    }

    const devicePairing = await prisma.devicePairing.findFirst({
      where: {
        deviceId,
        userId,
        isActive: true,
      },
    });

    if (!devicePairing) {
      return NextResponse.json(
        { success: false, error: 'Device not found or not paired' },
        { status: 404 }
      );
    }

    await prisma.devicePermission.deleteMany({
      where: { devicePairingId: devicePairing.id },
    });

    await prisma.devicePermission.createMany({
      data: permissions.map((permission) => ({
        devicePairingId: devicePairing.id,
        permission,
      })),
    });

    logger.info('[QR] Permissions granted', { deviceId, scopes: permissions.length });

    return NextResponse.json({
      success: true,
      deviceId,
      permissions,
      grantedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (deviceId) {
      const devicePairing = await prisma.devicePairing.findFirst({
        where: {
          deviceId,
          userId,
          isActive: true,
        },
        include: {
          permissions: true,
        },
      });

      if (!devicePairing) {
        return NextResponse.json(
          { success: false, error: 'Device not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        deviceId,
        permissions: devicePairing.permissions.map((p) => p.permission),
      });
    } else {
      const devicePairings = await prisma.devicePairing.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          permissions: true,
        },
      });

      return NextResponse.json({
        success: true,
        devices: devicePairings.map((dp) => ({
          deviceId: dp.deviceId,
          deviceType: dp.deviceType,
          deviceName: dp.deviceName,
          permissions: dp.permissions.map((p) => p.permission),
        })),
      });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

export const PUT = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body: UpdatePermissionsRequest = await request.json();
    const { deviceId, permissions } = body;
    const userId = context.user!.id;

    if (!deviceId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const devicePairing = await prisma.devicePairing.findFirst({
      where: {
        deviceId,
        userId,
        isActive: true,
      },
    });

    if (!devicePairing) {
      return NextResponse.json(
        { success: false, error: 'Device not found or not paired' },
        { status: 404 }
      );
    }

    await prisma.devicePermission.deleteMany({
      where: { devicePairingId: devicePairing.id },
    });

    await prisma.devicePermission.createMany({
      data: permissions.map((permission) => ({
        devicePairingId: devicePairing.id,
        permission,
      })),
    });

    logger.info('[QR] Permissions updated', { deviceId, scopes: permissions.length });

    return NextResponse.json({
      success: true,
      deviceId,
      permissions,
      updatedAt: Date.now(),
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
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

    const devicePairing = await prisma.devicePairing.findFirst({
      where: {
        deviceId,
        userId,
        isActive: true,
      },
    });

    if (!devicePairing) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    await prisma.devicePermission.deleteMany({
      where: { devicePairingId: devicePairing.id },
    });

    logger.info('[QR] All permissions revoked', { deviceId });

    return NextResponse.json({
      success: true,
      message: 'Permissions revoked successfully',
      deviceId,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
