/**
 * Template Favorites API
 *
 * Add/remove templates from user's favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const templateId = params.id;
    const userId = context.user!.id;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      );
    }

    const template = await prisma.clinicalTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const existing = await prisma.templateFavorite.findUnique({
      where: {
        userId_templateId: {
          userId,
          templateId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Template already in favorites' },
        { status: 400 }
      );
    }

    const maxSortOrder = await prisma.templateFavorite.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

    const favorite = await prisma.templateFavorite.create({
      data: {
        userId,
        templateId,
        sortOrder: nextSortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      data: favorite,
      message: 'Template added to favorites',
    }, { status: 201 });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const templateId = params.id;
    const userId = context.user!.id;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      );
    }

    const favorite = await prisma.templateFavorite.findUnique({
      where: {
        userId_templateId: {
          userId,
          templateId,
        },
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: 'Template not in favorites' },
        { status: 404 }
      );
    }

    await prisma.templateFavorite.delete({
      where: {
        userId_templateId: {
          userId,
          templateId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template removed from favorites',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
