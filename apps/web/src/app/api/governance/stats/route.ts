import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/governance/stats
 * Returns aggregated safety statistics for the Mission Control dashboard
 */
export async function GET(request: NextRequest) {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Check if the GovernanceLog model exists in Prisma schema
        // If not, return default stats for demo purposes
        const sessionsAudited = await (prisma as any).governanceLog?.count?.({
            where: { timestamp: { gte: oneDayAgo } },
        }).catch(() => null);

        if (sessionsAudited === null) {
            // GovernanceLog doesn't exist yet, return demo stats
            return NextResponse.json({
                data: {
                    sessionsAudited: 0,
                    interventionsTriggered: 0,
                    avgSafetyScore: 0,
                },
                message: 'Governance tables not yet migrated. Run prisma db push.'
            });
        }

        // Count interventions (HARD_BLOCK events)
        const interventionsTriggered = await (prisma as any).governanceEvent?.count?.({
            where: {
                timestamp: { gte: oneDayAgo },
                severity: 'HARD_BLOCK',
            },
        }).catch(() => 0) || 0;

        // Calculate average safety score
        const avgScoreResult = await (prisma as any).governanceLog?.aggregate?.({
            _avg: { safetyScore: true },
            where: { timestamp: { gte: oneDayAgo } },
        }).catch(() => ({ _avg: { safetyScore: null } }));

        // Default to 100 if no data (system is healthy with no audits)
        const avgSafetyScore = Math.round(avgScoreResult?._avg?.safetyScore ?? (sessionsAudited > 0 ? 100 : 0));

        return NextResponse.json({
            data: {
                sessionsAudited: sessionsAudited || 0,
                interventionsTriggered,
                avgSafetyScore,
            }
        });
    } catch (error) {
        console.error('Failed to fetch safety stats:', error);
        return NextResponse.json({
            data: {
                sessionsAudited: 0,
                interventionsTriggered: 0,
                avgSafetyScore: 0,
            },
            error: 'Failed to fetch safety stats'
        }, { status: 500 });
    }
}
