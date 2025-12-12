/**
 * AI Insights API
 *
 * GET /api/ai/insights - Get clinical decision support insights
 *
 * CDSS (Clinical Decision Support System) endpoint that replaces hardcoded
 * AIInsights with real-time clinical intelligence based on patient data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { cdssService } from '@/lib/services/cdss.service';

export const dynamic = 'force-dynamic';

// Cache insights for 5 minutes (300 seconds)
const CACHE_DURATION = 300;
const insightsCache = new Map<string, { data: any; timestamp: number }>();

/**
 * GET /api/ai/insights
 * Get AI-generated clinical insights for the authenticated clinician
 *
 * This endpoint generates insights by analyzing:
 * - Patient medications (drug interactions)
 * - Vital signs (sepsis risk, cardiac risk)
 * - Lab results (critical values)
 * - Preventive care (overdue screenings)
 * - Cost optimization (generic alternatives)
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const clinicianId = context.user.id;
      const cacheKey = `insights_${clinicianId}`;

      // Check cache
      const cached = insightsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
        console.log('✅ Returning cached insights for clinician:', clinicianId);

        return NextResponse.json({
          success: true,
          data: cached.data,
          metadata: {
            cached: true,
            generatedAt: new Date(cached.timestamp).toISOString(),
            clinicianId,
          },
        });
      }

      // Generate fresh insights
      console.log('🧠 Generating CDSS insights for clinician:', clinicianId);

      const insights = await cdssService.generateInsights(clinicianId);

      // Category counts
      const categoryCounts = {
        clinical: insights.filter((i) => i.category === 'clinical').length,
        operational: insights.filter((i) => i.category === 'operational').length,
        financial: insights.filter((i) => i.category === 'financial').length,
      };

      // Priority counts
      const priorityCounts = {
        critical: insights.filter((i) => i.priority === 'critical').length,
        high: insights.filter((i) => i.priority === 'high').length,
        medium: insights.filter((i) => i.priority === 'medium').length,
        low: insights.filter((i) => i.priority === 'low').length,
      };

      const responseData = {
        insights,
        summary: {
          total: insights.length,
          categories: categoryCounts,
          priorities: priorityCounts,
        },
      };

      // Update cache
      insightsCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      console.log('✅ CDSS insights generated:', {
        total: insights.length,
        critical: priorityCounts.critical,
        high: priorityCounts.high,
        clinicianId,
      });

      return NextResponse.json({
        success: true,
        data: responseData,
        metadata: {
          cached: false,
          generatedAt: new Date().toISOString(),
          clinicianId,
          cacheDuration: CACHE_DURATION,
        },
      });
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate AI insights',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/ai/insights (Cache Invalidation)
 * Force regeneration of insights by clearing cache
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const clinicianId = context.user.id;
      const cacheKey = `insights_${clinicianId}`;

      // Clear cache
      insightsCache.delete(cacheKey);

      console.log('🔄 Cache cleared for clinician:', clinicianId);

      return NextResponse.json({
        success: true,
        message: 'Insights cache cleared. Next GET request will generate fresh insights.',
      });
    } catch (error: any) {
      console.error('Error clearing insights cache:', error);
      return NextResponse.json(
        {
          error: 'Failed to clear cache',
          message: error.message,
        },
        { status: 500 }
      );
    }
  }
);
