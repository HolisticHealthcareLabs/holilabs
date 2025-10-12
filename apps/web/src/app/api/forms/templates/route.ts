/**
 * Form Templates API
 *
 * GET /api/forms/templates - List all form templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FormCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category && category !== 'all' ? { category: category as FormCategory, isActive: true } : { isActive: true };

    const templates = await prisma.formTemplate.findMany({
      where,
      orderBy: [{ isBuiltIn: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        estimatedMinutes: true,
        usageCount: true,
        isBuiltIn: true,
        tags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, templates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching form templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form templates' },
      { status: 500 }
    );
  }
}
