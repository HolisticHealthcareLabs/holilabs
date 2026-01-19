/**
 * AI Usage Dashboard API
 *
 * GET /api/admin/ai-usage - Get AI usage statistics for CFO dashboard
 *
 * Provides:
 * - Daily/weekly/monthly cost breakdown
 * - Cost per clinic
 * - Provider cost comparison
 * - Budget alerts
 * - Cache efficiency metrics
 *
 * Access: ADMIN role only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUsageSummary, checkCostAlerts } from '@/lib/ai/usage-tracker';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface UsageStats {
  period: {
    start: string;
    end: string;
    label: string;
  };
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  cacheHitRate: number;
  providerBreakdown: {
    provider: string;
    cost: number;
    requests: number;
    avgResponseTime: number;
  }[];
  featureBreakdown: {
    feature: string;
    cost: number;
    requests: number;
  }[];
  dailyTrend: {
    date: string;
    cost: number;
    requests: number;
  }[];
  budgetStatus: {
    currentSpend: number;
    monthlyBudget: number;
    percentUsed: number;
    projectedMonthlySpend: number;
    isOverBudget: boolean;
    isApproachingBudget: boolean;
  };
}

/**
 * GET /api/admin/ai-usage
 *
 * Query parameters:
 * - period: 'day' | 'week' | 'month' | 'quarter' (default: 'month')
 * - clinicId: string (optional - filter by clinic)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const clinicId = searchParams.get('clinicId') || undefined;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setUTCHours(0, 0, 0, 0);
        periodLabel = 'Today';
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setUTCDate(startDate.getUTCDate() - 7);
        periodLabel = 'Last 7 Days';
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setUTCMonth(startDate.getUTCMonth() - 3);
        periodLabel = 'Last 3 Months';
        break;
      case 'month':
      default:
        startDate = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
        periodLabel = 'This Month';
        break;
    }

    logger.info({
      event: 'ai_usage_dashboard_request',
      period,
      clinicId,
      startDate: startDate.toISOString(),
    });

    // Build where clause
    const where: {
      createdAt: { gte: Date; lte: Date };
      clinicId?: string;
    } = {
      createdAt: {
        gte: startDate,
        lte: now,
      },
    };

    if (clinicId) {
      where.clinicId = clinicId;
    }

    // Get aggregate statistics
    const [totalStats, providerStats, featureStats, dailyStats] = await Promise.all([
      // Total aggregates
      prisma.aIUsageLog.aggregate({
        where,
        _sum: {
          estimatedCost: true,
          totalTokens: true,
          responseTimeMs: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          responseTimeMs: true,
        },
      }),

      // By provider
      prisma.aIUsageLog.groupBy({
        by: ['provider'],
        where,
        _sum: {
          estimatedCost: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          responseTimeMs: true,
        },
      }),

      // By feature
      prisma.aIUsageLog.groupBy({
        by: ['feature'],
        where,
        _sum: {
          estimatedCost: true,
        },
        _count: {
          id: true,
        },
      }),

      // Daily breakdown (last 30 days max)
      prisma.$queryRaw<Array<{ date: string; cost: number; requests: bigint }>>`
        SELECT
          DATE(created_at) as date,
          SUM(estimated_cost) as cost,
          COUNT(*) as requests
        FROM ai_usage_logs
        WHERE created_at >= ${startDate}
          AND created_at <= ${now}
          ${clinicId ? prisma.$queryRaw`AND clinic_id = ${clinicId}` : prisma.$queryRaw``}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
        LIMIT 30
      `.catch(() => []), // Fallback to empty array if raw query fails
    ]);

    // Calculate cache hit rate
    const cacheStats = await prisma.aIUsageLog.groupBy({
      by: ['fromCache'],
      where,
      _count: {
        id: true,
      },
    });

    const cacheHits = cacheStats.find(s => s.fromCache === true)?._count.id || 0;
    const totalRequests = totalStats._count.id || 1;
    const cacheHitRate = cacheHits / totalRequests;

    // Get budget status
    const budgetStatus = await checkCostAlerts(clinicId || 'default', 500); // $500 default budget

    // Format response
    const stats: UsageStats = {
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        label: periodLabel,
      },
      totalCost: totalStats._sum.estimatedCost || 0,
      totalTokens: totalStats._sum.totalTokens || 0,
      totalRequests,
      cacheHitRate,
      providerBreakdown: providerStats.map(p => ({
        provider: p.provider,
        cost: p._sum.estimatedCost || 0,
        requests: p._count.id,
        avgResponseTime: p._avg.responseTimeMs || 0,
      })),
      featureBreakdown: featureStats
        .filter(f => f.feature !== null)
        .map(f => ({
          feature: f.feature || 'unknown',
          cost: f._sum.estimatedCost || 0,
          requests: f._count.id,
        }))
        .sort((a, b) => b.cost - a.cost),
      dailyTrend: (dailyStats as Array<{ date: string; cost: number; requests: bigint }>).map(d => ({
        date: String(d.date),
        cost: Number(d.cost) || 0,
        requests: Number(d.requests) || 0,
      })),
      budgetStatus,
    };

    // Audit log for compliance
    await createAuditLog({
      action: 'READ',
      resource: 'AIUsageReport',
      resourceId: clinicId || 'all',
      details: {
        period,
        totalCost: stats.totalCost,
        totalRequests: stats.totalRequests,
      },
      success: true,
    });

    logger.info({
      event: 'ai_usage_dashboard_response',
      period,
      clinicId,
      totalCost: stats.totalCost,
      totalRequests: stats.totalRequests,
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({
      event: 'ai_usage_dashboard_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch AI usage statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/ai-usage/clinics
 *
 * Get AI usage breakdown by clinic for multi-tenant dashboards
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'clinic_breakdown') {
      // Get this month's start
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const clinicStats = await prisma.aIUsageLog.groupBy({
        by: ['clinicId'],
        where: {
          createdAt: {
            gte: monthStart,
          },
          clinicId: {
            not: null,
          },
        },
        _sum: {
          estimatedCost: true,
          totalTokens: true,
        },
        _count: {
          id: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: clinicStats.map(c => ({
          clinicId: c.clinicId,
          cost: c._sum.estimatedCost || 0,
          tokens: c._sum.totalTokens || 0,
          requests: c._count.id,
        })),
      });
    }

    if (action === 'export_csv') {
      // Export usage data as CSV for finance team
      const { startDate, endDate } = body;

      const logs = await prisma.aIUsageLog.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        select: {
          createdAt: true,
          provider: true,
          model: true,
          clinicId: true,
          feature: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          estimatedCost: true,
          responseTimeMs: true,
          fromCache: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Generate CSV
      const headers = [
        'Date',
        'Provider',
        'Model',
        'Clinic ID',
        'Feature',
        'Prompt Tokens',
        'Completion Tokens',
        'Total Tokens',
        'Cost (USD)',
        'Response Time (ms)',
        'Cache Hit',
      ];

      const rows = logs.map(log => [
        log.createdAt.toISOString(),
        log.provider,
        log.model || '',
        log.clinicId || '',
        log.feature || '',
        log.promptTokens,
        log.completionTokens,
        log.totalTokens,
        log.estimatedCost.toFixed(6),
        log.responseTimeMs,
        log.fromCache ? 'Yes' : 'No',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ai-usage-${startDate}-${endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error({
      event: 'ai_usage_admin_action_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
      },
      { status: 500 }
    );
  }
}
