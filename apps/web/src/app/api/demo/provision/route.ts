import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { getPersonaForDiscipline } from '@/lib/demo/personas';

const DEMO_TTL_HOURS = 24;

// Maps jurisdiction IDs to billing standard slugs stored in workspace metadata
const JURISDICTION_BILLING_MAP: Record<string, { billingStandard: string; country: string; regulatoryBody: string }> = {
  BR:    { billingStandard: 'CBHPM/TUSS/TISS',             country: 'Brazil',        regulatoryBody: 'ANS / ANVISA / CFM' },
  US:    { billingStandard: 'CPT/ICD-10-CM/HCPCS/CMS-1500', country: 'United States', regulatoryBody: 'CMS / FDA / AMA' },
  AR:    { billingStandard: 'NN/PMO/ICD-10',               country: 'Argentina',     regulatoryBody: 'Superintendencia de Servicios de Salud / ANMAT' },
  BO:    { billingStandard: 'CIE-10/SOAT/SNIS',            country: 'Bolivia',       regulatoryBody: 'Ministerio de Salud / AGEMED / CNS' },
  MX:    { billingStandard: 'CIE-10/CAUSES/FPGC',          country: 'Mexico',        regulatoryBody: 'COFEPRIS / IMSS / Secretaría de Salud' },
  CO:    { billingStandard: 'CUPS/CIE-10/RIPS',            country: 'Colombia',      regulatoryBody: 'MinSalud / INVIMA / Supersalud' },
  OTHER: { billingStandard: 'ICD-10/SNOMED CT',            country: 'International', regulatoryBody: 'WHO / Local Authority' },
};

function generateDemoIdentity(persona: ReturnType<typeof getPersonaForDiscipline>) {
  const suffix = crypto.randomBytes(6).toString('hex');
  const plainPassword = `DemoPass_${crypto.randomBytes(8).toString('hex')}`;
  return {
    email: `demo-${suffix}@ephemeral.holilabs.internal`,
    firstName: persona.doctorFirst,
    lastName: persona.doctorLast,
    username: `demo_${persona.doctorLast.toLowerCase()}_${suffix.slice(0, 4)}`,
    plainPassword,
  };
}

// Normalize role value from demo setup to a valid DB UserRole enum value
function normalizeRole(role?: string): string {
  const map: Record<string, string> = {
    CLINICIAN:   'CLINICIAN',
    ADMIN:       'ADMIN',
    FRONT_DESK:  'STAFF',
    BILLING:     'STAFF',
  };
  return map[role ?? ''] ?? 'CLINICIAN';
}

export const POST = createPublicRoute(async (request: NextRequest): Promise<NextResponse> => {
  // Gate behind non-production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Demo provision is disabled in production' }, { status: 404 });
  }

  let body: { role?: string; disciplines?: string[]; jurisdiction?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body → use defaults
  }

  const { role, disciplines = [], jurisdiction = 'OTHER' } = body;
  const dbRole = normalizeRole(role);
  const billing = JURISDICTION_BILLING_MAP[jurisdiction] ?? JURISDICTION_BILLING_MAP.OTHER;

  // Pick persona for the first selected discipline (or general practice)
  const primaryDiscipline = disciplines[0] ?? 'general-practice';
  const persona = getPersonaForDiscipline(primaryDiscipline);

  try {
    const identity = generateDemoIdentity(persona);
    const expiresAt = new Date(Date.now() + DEMO_TTL_HOURS * 60 * 60 * 1000);
    const workspaceSlug = `demo-sandbox-${crypto.randomBytes(8).toString('hex')}`;
    const passwordHash = await bcrypt.hash(identity.plainPassword, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      // Build the today schedule from persona patients
      const today = new Date();
      const scheduleItems = persona.patients.map((p, i) => ({
        firstName: p.firstName,
        lastName:  p.lastName,
        age:       p.age,
        sex:       p.sex,
        chiefComplaint: p.chiefComplaint,
        status:    p.status,
        time:      `${(8 + i).toString().padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
        vitals:    p.vitals ?? {},
        date:      today.toISOString().slice(0, 10),
      }));

      // Create the ephemeral workspace, stamped with persona + jurisdiction
      const workspace = await tx.workspace.create({
        data: {
          name: `Demo — ${billing.country}`,
          slug: workspaceSlug,
          isEphemeral: true,
          expiresAt,
          createdByUserId: null,
          metadata: {
            jurisdiction,
            billingStandard: billing.billingStandard,
            regulatoryBody: billing.regulatoryBody,
            country: billing.country,
            demoRole: role ?? 'CLINICIAN',
            persona: {
              disciplineSlug:  persona.disciplineSlug,
              doctorTitle:     persona.doctorTitle,
              doctorFirst:     persona.doctorFirst,
              doctorLast:      persona.doctorLast,
              specialty:       persona.specialty,
              schedule:        scheduleItems,
              soapNote:        persona.soapNote,
              cdssAlerts:      persona.cdssAlerts,
            },
          },
        },
      });

      // Create the ephemeral user — use the persona doctor's real name
      const user = await tx.user.create({
        data: {
          email:               identity.email,
          firstName:           identity.firstName,
          lastName:            identity.lastName,
          username:            identity.username,
          role:                dbRole,
          specialty:           persona.specialty,
          onboardingCompleted: true,
          isEphemeral:         true,
          passwordHash,
        },
      });

      // Bind user to workspace
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId:      user.id,
          role:        'OWNER',
        },
      });

      // Seed disciplines — always include 'universal', plus user selections
      const slugsToSeed = [...new Set([...disciplines, 'universal'])];
      const foundDisciplines = await tx.discipline.findMany({
        where: { slug: { in: slugsToSeed }, status: 'ACTIVE' },
        select: { id: true },
      });

      for (const disc of foundDisciplines) {
        await tx.tenantDiscipline.create({
          data: { tenantId: workspace.id, disciplineId: disc.id },
        });
      }

      return {
        tenantId:    workspace.id,
        userId:      user.id,
        workspaceId: workspace.id,
        expiresAt:   expiresAt.toISOString(),
        userName:    `${persona.doctorTitle} ${identity.firstName} ${identity.lastName}`,
      };
    });

    logger.info({
      event:        'demo_tenant_provisioned',
      tenantId:     result.tenantId,
      userId:       result.userId,
      role:         dbRole,
      jurisdiction,
      disciplines,
      persona:      persona.disciplineSlug,
      expiresAt:    result.expiresAt,
    });

    return NextResponse.json({
      success:     true,
      redirectTo:  '/dashboard/my-day',
      credentials: {
        email:    identity.email,
        password: identity.plainPassword,
      },
      tenant: {
        id:        result.tenantId,
        expiresAt: result.expiresAt,
      },
      user: {
        id:   result.userId,
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
});
