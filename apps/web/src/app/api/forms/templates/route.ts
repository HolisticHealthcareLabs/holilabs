/**
 * Form Templates API
 *
 * GET /api/forms/templates - List all form templates
 * POST /api/forms/templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { FormCategory } from '@prisma/client';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
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
      logger.error('Error fetching form templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch form templates' },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const userId = context.user?.id;
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
          createdBy: userId,
          usageCount: 0,
        },
      });

      return NextResponse.json(
        { success: true, template },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error creating form template:', error);
      return NextResponse.json(
        { error: 'Failed to create form template' },
        { status: 500 }
      );
    }
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
