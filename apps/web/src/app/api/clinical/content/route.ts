import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { ContentMatrixService } from '@/services/content-matrix.service';
import type { PersonaKind } from '@prisma/client';

function normalizePersona(role?: string | null): PersonaKind {
  if (!role) return 'CLINICIAN';
  const upper = role.toUpperCase();
  if (upper === 'ADMIN' || upper === 'ORG_ADMIN' || upper === 'OWNER') return 'ORG_ADMIN';
  if (upper === 'NURSE') return 'NURSE';
  if (upper === 'RECEPTIONIST' || upper === 'STAFF') return 'FRONT_DESK';
  if (upper === 'BILLING') return 'BILLING';
  return 'CLINICIAN';
}

function specialtyToSlug(specialty: string): string {
  return specialty
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as Record<string, unknown>;
    const tenantId = (user.organizationId as string | undefined) ?? 'org-demo-clinic';
    const persona = normalizePersona(user.role as string | undefined);

    const rawSpecialty = (user.specialty as string | undefined) ?? '';
    const disciplineSlugs = rawSpecialty
      .split(',')
      .map((s) => specialtyToSlug(s))
      .filter(Boolean);

    const result = await ContentMatrixService.resolve({
      tenantId,
      persona,
      disciplineSlugs,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to resolve content matrix';

    return NextResponse.json(
      {
        error: message,
        definitions: [],
        totalDefinitions: 0,
      },
      { status: 500 }
    );
  }
}
