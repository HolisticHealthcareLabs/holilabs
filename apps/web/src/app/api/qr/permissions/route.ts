/**
 * Permission Management API
 * Handles permission grants, revocations, and queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import type { PermissionScope } from '@/lib/qr/types';

interface GrantPermissionsRequest {
  deviceId: string;
  permissions: PermissionScope[];
}

interface UpdatePermissionsRequest {
  deviceId: string;
  permissions: PermissionScope[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GrantPermissionsRequest = await request.json();
    const { deviceId, permissions } = body;

    if (!deviceId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions: PermissionScope[] = [
      'READ_PATIENT_DATA',
      'WRITE_NOTES',
      'VIEW_TRANSCRIPT',
      'CONTROL_RECORDING',
      'ACCESS_DIAGNOSIS',
      'VIEW_MEDICATIONS',
      'EDIT_SOAP_NOTES',
      'FULL_ACCESS',
    ];

    const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid permissions: ${invalidPerms.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the device pairing
    const devicePairing = await prisma.devicePairing.findFirst({
      where: {
        deviceId,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!devicePairing) {
      return NextResponse.json(
        { success: false, error: 'Device not found or not paired' },
        { status: 404 }
      );
    }

    // Delete existing permissions
    await prisma.devicePermission.deleteMany({
      where: { devicePairingId: devicePairing.id },
    });

    // Create new permissions
    await prisma.devicePermission.createMany({
      data: permissions.map((permission) => ({
        devicePairingId: devicePairing.id,
        permission,
      })),
    });

    console.log(`Permissions granted to device ${deviceId}:`, permissions);

    return NextResponse.json({
      success: true,
      deviceId,
      permissions,
      grantedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  } catch (error) {
    console.error('Grant permissions error:', error);
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

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (deviceId) {
      // Get permissions for specific device
      const devicePairing = await prisma.devicePairing.findFirst({
        where: {
          deviceId,
          userId: session.user.id,
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
      // Get all device permissions for user
      const devicePairings = await prisma.devicePairing.findMany({
        where: {
          userId: session.user.id,
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
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdatePermissionsRequest = await request.json();
    const { deviceId, permissions } = body;

    if (!deviceId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Find the device pairing
    const devicePairing = await prisma.devicePairing.findFirst({
      where: {
        deviceId,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!devicePairing) {
      return NextResponse.json(
        { success: false, error: 'Device not found or not paired' },
        { status: 404 }
      );
    }

    // Delete existing permissions
    await prisma.devicePermission.deleteMany({
      where: { devicePairingId: devicePairing.id },
    });

    // Create new permissions
    await prisma.devicePermission.createMany({
      data: permissions.map((permission) => ({
        devicePairingId: devicePairing.id,
        permission,
      })),
    });

    console.log(`Permissions updated for device ${deviceId}:`, permissions);

    return NextResponse.json({
      success: true,
      deviceId,
      permissions,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Update permissions error:', error);
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

    // Find the device pairing
    const devicePairing = await prisma.devicePairing.findFirst({
      where: {
        deviceId,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!devicePairing) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    // Revoke all permissions for device
    await prisma.devicePermission.deleteMany({
      where: { devicePairingId: devicePairing.id },
    });

    console.log(`All permissions revoked for device ${deviceId}`);

    return NextResponse.json({
      success: true,
      message: 'Permissions revoked successfully',
      deviceId,
    });
  } catch (error) {
    console.error('Revoke permissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
