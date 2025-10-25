import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/templates - Search templates
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20');

  const templates = await prisma.clinicalTemplate.findMany({
    where: {
      AND: [
        {
          OR: [
            { isPublic: true },
            { createdById: session.user.id },
          ],
        },
        query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { shortcut: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        } : {},
        category ? { category } : {},
      ],
    },
    orderBy: [
      { isOfficial: 'desc' },
      { useCount: 'desc' },
      { name: 'asc' },
    ],
    take: limit,
  });

  return NextResponse.json({ templates });
}

// POST /api/templates - Create template
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const template = await prisma.clinicalTemplate.create({
    data: {
      ...body,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ template });
}
