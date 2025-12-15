/**
 * Individual Template API
 *
 * UPDATE, DELETE, and increment usage for specific templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum([
    'CHIEF_COMPLAINT',
    'HISTORY_OF_PRESENT_ILLNESS',
    'REVIEW_OF_SYSTEMS',
    'PHYSICAL_EXAM',
    'ASSESSMENT',
    'PLAN',
    'PRESCRIPTION',
    'PATIENT_EDUCATION',
    'FOLLOW_UP',
    'PROCEDURE_NOTE',
    'DISCHARGE_SUMMARY',
    'PROGRESS_NOTE',
    'CONSULTATION',
    'CUSTOM',
  ]).optional(),
  specialty: z.string().optional(),
  content: z.string().min(1).optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'number', 'date', 'select']),
    label: z.string().optional(),
    default: z.any().optional(),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  })).optional(),
  shortcut: z.string().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/templates/[id]
 * Fetch a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = params;

    const template = await prisma.clinicalTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        favorites: {
          where: { userId },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check access: must be public or owned by user
    if (!template.isPublic && template.createdById !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        isFavorite: template.favorites.length > 0,
        favorites: undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template or increment usage count
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = params;
    const body = await request.json();

    // Check if this is a usage increment request
    if (body.action === 'increment_usage') {
      const template = await prisma.clinicalTemplate.update({
        where: { id },
        data: {
          useCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        data: template,
        message: 'Usage count incremented',
      });
    }

    // Otherwise, it's an update request
    const template = await prisma.clinicalTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Only creator can update
    if (template.createdById !== userId) {
      return NextResponse.json(
        { error: 'Only the template creator can update it' },
        { status: 403 }
      );
    }

    // Validate update data
    const validationResult = updateTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if new shortcut is unique (if provided)
    if (data.shortcut && data.shortcut !== template.shortcut) {
      const existing = await prisma.clinicalTemplate.findUnique({
        where: { shortcut: data.shortcut },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Shortcut already in use' },
          { status: 400 }
        );
      }
    }

    // Update template
    const updatedTemplate = await prisma.clinicalTemplate.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await logAudit(
      {
        action: 'UPDATE',
        resource: 'ClinicalTemplate',
        resourceId: id,
        details: {
          templateName: updatedTemplate.name,
          changes: data,
        },
      },
      undefined,
      userId
    );

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
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
    const { id } = params;

    const template = await prisma.clinicalTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Only creator or admin can delete
    const user = session.user as any;
    if (template.createdById !== userId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only the template creator or admin can delete it' },
        { status: 403 }
      );
    }

    // Delete template (cascades to favorites)
    await prisma.clinicalTemplate.delete({
      where: { id },
    });

    // Audit log
    await logAudit(
      {
        action: 'DELETE',
        resource: 'ClinicalTemplate',
        resourceId: id,
        details: {
          templateName: template.name,
          category: template.category,
        },
      },
      undefined,
      userId
    );

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
