/**
 * Form Templates API
 *
 * GET /api/forms/templates - List all form templates
 * POST /api/forms/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
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

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, estimatedMinutes, structure, isBuiltIn, tags } = body;

    // Validation
    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.formTemplate.create({
      data: {
        title,
        description: description || null,
        category: category as FormCategory,
        estimatedMinutes: estimatedMinutes || 10,
        structure: structure || null,
        isBuiltIn: isBuiltIn || false,
        isActive: true,
        tags: tags || [],
        createdBy: session.user.id,
        usageCount: 0,
      },
    });

    return NextResponse.json(
      { success: true, template },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating form template:', error);
    return NextResponse.json(
      { error: 'Failed to create form template' },
      { status: 500 }
    );
  }
}
