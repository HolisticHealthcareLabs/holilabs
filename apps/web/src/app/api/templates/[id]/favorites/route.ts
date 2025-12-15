/**
 * Template Favorites API
 *
 * Add/remove templates from user's favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/templates/[id]/favorites
 * Add template to favorites
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: templateId } = params;

    // Check if template exists
    const template = await prisma.clinicalTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if already favorited
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

    // Get current max sort order for user's favorites
    const maxSortOrder = await prisma.templateFavorite.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

    // Create favorite
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
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]/favorites
 * Remove template from favorites
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: templateId } = params;

    // Check if favorited
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

    // Remove favorite
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
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
