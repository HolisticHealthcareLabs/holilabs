/**
 * Clinical Templates API - Industry Grade
 *
 * Manage clinical templates with keyboard shortcuts, favorites, and usage tracking
 *
 * Features:
 * - CRUD operations for templates
 * - Favorites management
 * - Usage tracking
 * - Search and filter
 * - Public vs private templates
 * - Keyboard shortcut management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
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
  ]),
  specialty: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'number', 'date', 'select']),
    label: z.string().optional(),
    default: z.any().optional(),
    options: z.array(z.string()).optional(), // For select type
    required: z.boolean().optional(),
  })).optional(),
  shortcut: z.string().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/templates
 * Fetch templates with filtering, search, and favorites
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const specialty = searchParams.get('specialty');
    const onlyFavorites = searchParams.get('favorites') === 'true';
    const onlyPublic = searchParams.get('public') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const whereConditions: any[] = [];

    // Access control: public templates or user's own
    if (onlyPublic) {
      whereConditions.push({ isPublic: true });
    } else {
      whereConditions.push({
        OR: [
          { isPublic: true },
          { createdById: userId },
        ],
      });
    }

    // Search filter
    if (query) {
      whereConditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { shortcut: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      });
    }

    // Category filter
    if (category) {
      whereConditions.push({ category });
    }

    // Specialty filter
    if (specialty) {
      whereConditions.push({ specialty });
    }

    // Fetch templates
    const templates = await prisma.clinicalTemplate.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : undefined,
      take: limit,
      orderBy: [
        { isOfficial: 'desc' }, // Official templates first
        { useCount: 'desc' }, // Then by popularity
        { name: 'asc' },
      ],
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
          select: {
            id: true,
            sortOrder: true,
          },
        },
      },
    });

    // Filter favorites if requested
    let filteredTemplates = templates;
    if (onlyFavorites) {
      filteredTemplates = templates.filter(t => t.favorites.length > 0);
    }

    // Add isFavorite flag and remove favorites array
    const templatesWithMeta = filteredTemplates.map(t => ({
      ...t,
      isFavorite: t.favorites.length > 0,
      favoriteSortOrder: t.favorites.length > 0 ? t.favorites[0].sortOrder : null,
      favorites: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: templatesWithMeta,
      count: templatesWithMeta.length,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new clinical template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Validate input
    const validationResult = createTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if shortcut is unique (if provided)
    if (data.shortcut) {
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

    // Create template
    const template = await prisma.clinicalTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        specialty: data.specialty,
        content: data.content,
        variables: data.variables || [],
        shortcut: data.shortcut,
        isPublic: data.isPublic ?? false,
        createdById: userId,
      },
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
        action: 'CREATE',
        resource: 'ClinicalTemplate',
        resourceId: template.id,
        details: {
          templateName: template.name,
          category: template.category,
          isPublic: template.isPublic,
        },
      },
      undefined,
      userId
    );

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
