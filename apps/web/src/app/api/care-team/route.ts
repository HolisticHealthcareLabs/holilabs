import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { patientId, name, members } = await request.json();

  if (!patientId || !name) {
    return NextResponse.json({ error: 'patientId and name required' }, { status: 400 });
  }

  // Verify patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const carePlan = await prisma.carePlan.create({
    data: {
      patientId,
      title: `Care Team: ${name}`,
      description: `Interdisciplinary care team: ${name}`,
      category: 'PSYCHOSOCIAL_SUPPORT',
      status: 'ACTIVE',
      createdBy: session.user.id,
      assignedTeam: members?.map((m: { userId: string }) => m.userId) ?? [],
      goals: [`Coordinate care for patient via team: ${name}`],
    },
  });

  return NextResponse.json({ success: true, careTeamId: carePlan.id });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json({ error: 'patientId required' }, { status: 400 });
  }

  const carePlans = await prisma.carePlan.findMany({
    where: {
      patientId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    careTeams: carePlans.map(ct => ({
      id: ct.id,
      name: ct.title,
      assignedTeam: ct.assignedTeam,
      createdAt: ct.createdAt,
    })),
  });
}
