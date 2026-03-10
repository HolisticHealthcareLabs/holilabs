import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import logger from '@/lib/logger';

const DEMO_TTL_HOURS = 24;

function generateDemoIdentity() {
  const suffix = crypto.randomBytes(6).toString('hex');
  return {
    email: `demo-${suffix}@ephemeral.holilabs.internal`,
    firstName: 'Demo',
    lastName: `User ${suffix.slice(0, 4).toUpperCase()}`,
    username: `demo_${suffix}`,
  };
}

export async function POST(): Promise<NextResponse> {
  try {
    const identity = generateDemoIdentity();
    const expiresAt = new Date(Date.now() + DEMO_TTL_HOURS * 60 * 60 * 1000);
    const workspaceSlug = `demo-sandbox-${crypto.randomBytes(8).toString('hex')}`;

    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: 'Demo Sandbox',
          slug: workspaceSlug,
          isEphemeral: true,
          expiresAt,
          createdByUserId: null,
        },
      });

      const user = await tx.user.create({
        data: {
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
          username: identity.username,
          role: 'CLINICIAN',
          specialty: 'Internal Medicine',
          onboardingCompleted: true,
          isEphemeral: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      const disciplines = await tx.discipline.findMany({
        where: {
          slug: { in: ['internal-medicine', 'cardiology', 'universal'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      for (const disc of disciplines) {
        await tx.tenantDiscipline.create({
          data: {
            tenantId: workspace.id,
            disciplineId: disc.id,
          },
        });
      }

      return {
        tenantId: workspace.id,
        userId: user.id,
        workspaceId: workspace.id,
        expiresAt: expiresAt.toISOString(),
        userName: `${identity.firstName} ${identity.lastName}`,
      };
    });

    logger.info({
      event: 'demo_tenant_provisioned',
      tenantId: result.tenantId,
      userId: result.userId,
      expiresAt: result.expiresAt,
    });

    return NextResponse.json({
      success: true,
      redirectTo: '/dashboard/my-day',
      tenant: {
        id: result.tenantId,
        expiresAt: result.expiresAt,
      },
      user: {
        id: result.userId,
        name: result.userName,
      },
    });
  } catch (error) {
    logger.error({
      event: 'demo_provision_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to provision demo environment' },
      { status: 500 }
    );
  }
}
