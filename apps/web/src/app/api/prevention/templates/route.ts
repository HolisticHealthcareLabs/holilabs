/**
 * Prevention Plan Templates API
 *
 * GET /api/prevention/templates - List all templates
 * POST /api/prevention/templates - Create a new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface TemplateGoal {
  goal: string;
  category: string;
  timeframe?: string;
  priority?: string;
}

interface TemplateRecommendation {
  title: string;
  description: string;
  category: string;
  priority?: string;
}

/**
 * GET /api/prevention/templates
 * Get all prevention plan templates
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const planType = searchParams.get('planType');
    const isActive = searchParams.get('isActive');

    // Build filter conditions
    const whereConditions: any = {};

    if (planType) {
      whereConditions.planType = planType;
    }

    if (isActive !== null) {
      whereConditions.isActive = isActive === 'true';
    }

    // Fetch templates
    const templates = await prisma.preventionPlanTemplate.findMany({
      where: whereConditions,
      orderBy: [
        { isActive: 'desc' },
        { useCount: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        templateName: true,
        planType: true,
        description: true,
        guidelineSource: true,
        evidenceLevel: true,
        goals: true,
        recommendations: true,
        isActive: true,
        useCount: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        templates,
        count: templates.length,
      },
    });
  } catch (error) {
    console.error('Error fetching templates:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prevention/templates
 * Create a new prevention plan template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      templateName,
      planType,
      description,
      guidelineSource,
      evidenceLevel,
      goals,
      recommendations,
    } = body;

    // Validate required fields
    if (!templateName || !planType) {
      return NextResponse.json(
        { error: 'Template name and plan type are required' },
        { status: 400 }
      );
    }

    // Validate goals structure
    if (goals && Array.isArray(goals)) {
      for (const goal of goals) {
        if (!goal.goal || !goal.category) {
          return NextResponse.json(
            { error: 'Each goal must have a goal text and category' },
            { status: 400 }
          );
        }
      }
    }

    // Create template
    const template = await prisma.preventionPlanTemplate.create({
      data: {
        templateName,
        planType,
        description: description || null,
        guidelineSource: guidelineSource || null,
        evidenceLevel: evidenceLevel || null,
        goals: goals || [],
        recommendations: recommendations || [],
        isActive: true,
        useCount: 0,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: {
        template,
      },
    });
  } catch (error) {
    console.error('Error creating template:', error);

    return NextResponse.json(
      {
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
