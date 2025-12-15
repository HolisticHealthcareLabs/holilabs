/**
 * Prevention Search API
 *
 * GET /api/prevention/search - Search across prevention plans, templates, and reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface SearchResult {
  type: 'plan' | 'template' | 'reminder';
  id: string;
  title: string;
  description: string | null;
  planType?: string;
  status?: string;
  patientName?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

/**
 * GET /api/prevention/search
 * Search across prevention-related resources
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
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type'); // 'plan', 'template', 'reminder', or 'all'
    const planType = searchParams.get('planType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const results: SearchResult[] = [];

    // Search Prevention Plans
    if (!type || type === 'all' || type === 'plan') {
      const planWhere: any = {};

      // Text search
      if (query) {
        planWhere.OR = [
          { planName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { guidelineSource: { contains: query, mode: 'insensitive' } },
        ];
      }

      // Filters
      if (planType) planWhere.planType = planType;
      if (status) planWhere.status = status;

      // Date range
      if (startDate || endDate) {
        planWhere.createdAt = {};
        if (startDate) planWhere.createdAt.gte = new Date(startDate);
        if (endDate) planWhere.createdAt.lte = new Date(endDate);
      }

      const plans = await prisma.preventionPlan.findMany({
        where: planWhere,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      for (const plan of plans) {
        results.push({
          type: 'plan',
          id: plan.id,
          title: plan.planName,
          description: plan.description,
          planType: plan.planType,
          status: plan.status,
          patientName: plan.patient
            ? `${plan.patient.firstName} ${plan.patient.lastName}`
            : undefined,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
          metadata: {
            guidelineSource: plan.guidelineSource,
            evidenceLevel: plan.evidenceLevel,
            goalsCount: Array.isArray(plan.goals) ? plan.goals.length : 0,
            recommendationsCount: Array.isArray(plan.recommendations)
              ? plan.recommendations.length
              : 0,
          },
        });
      }
    }

    // Search Prevention Templates
    if (!type || type === 'all' || type === 'template') {
      const templateWhere: any = {};

      // Text search
      if (query) {
        templateWhere.OR = [
          { templateName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { guidelineSource: { contains: query, mode: 'insensitive' } },
        ];
      }

      // Filters
      if (planType) templateWhere.planType = planType;
      if (status === 'active') templateWhere.isActive = true;
      if (status === 'inactive') templateWhere.isActive = false;

      // Date range
      if (startDate || endDate) {
        templateWhere.createdAt = {};
        if (startDate) templateWhere.createdAt.gte = new Date(startDate);
        if (endDate) templateWhere.createdAt.lte = new Date(endDate);
      }

      const templates = await prisma.preventionPlanTemplate.findMany({
        where: templateWhere,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      for (const template of templates) {
        results.push({
          type: 'template',
          id: template.id,
          title: template.templateName,
          description: template.description,
          planType: template.planType,
          status: template.isActive ? 'active' : 'inactive',
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          metadata: {
            guidelineSource: template.guidelineSource,
            evidenceLevel: template.evidenceLevel,
            useCount: template.useCount,
            lastUsedAt: template.lastUsedAt,
            goalsCount: Array.isArray(template.goals) ? template.goals.length : 0,
            recommendationsCount: Array.isArray(template.recommendations)
              ? template.recommendations.length
              : 0,
          },
        });
      }
    }

    // Search Preventive Care Reminders
    if (!type || type === 'all' || type === 'reminder') {
      const reminderWhere: any = {};

      // Text search
      if (query) {
        reminderWhere.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { guidelineSource: { contains: query, mode: 'insensitive' } },
        ];
      }

      // Filters
      if (status) reminderWhere.status = status;

      // Date range
      if (startDate || endDate) {
        reminderWhere.createdAt = {};
        if (startDate) reminderWhere.createdAt.gte = new Date(startDate);
        if (endDate) reminderWhere.createdAt.lte = new Date(endDate);
      }

      const reminders = await prisma.preventiveCareReminder.findMany({
        where: reminderWhere,
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      for (const reminder of reminders) {
        results.push({
          type: 'reminder',
          id: reminder.id,
          title: reminder.title,
          description: reminder.description,
          status: reminder.status,
          patientName: reminder.patient
            ? `${reminder.patient.firstName} ${reminder.patient.lastName}`
            : undefined,
          createdAt: reminder.createdAt,
          updatedAt: reminder.updatedAt,
          metadata: {
            screeningType: reminder.screeningType,
            dueDate: reminder.dueDate,
            priority: reminder.priority,
            guidelineSource: reminder.guidelineSource,
            evidenceLevel: reminder.evidenceLevel,
          },
        });
      }
    }

    // Sort all results by updatedAt (most recent first)
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply pagination after combining
    const paginatedResults = results.slice(offset, offset + limit);

    // Calculate stats
    const stats = {
      totalResults: results.length,
      byType: {
        plans: results.filter((r) => r.type === 'plan').length,
        templates: results.filter((r) => r.type === 'template').length,
        reminders: results.filter((r) => r.type === 'reminder').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        results: paginatedResults,
        stats,
        query,
        pagination: {
          total: results.length,
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    console.error('Error searching prevention data:', error);

    return NextResponse.json(
      {
        error: 'Failed to search prevention data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
