import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/governance/logs
 * Returns the last 50 governance logs with events for the Mission Control dashboard
 */
export async function GET(request: NextRequest) {
    try {
        // Check if the GovernanceLog model exists in Prisma schema
        // If not, return mock data for demo purposes
        const logs = await (prisma as any).governanceLog?.findMany?.({
            take: 50,
            orderBy: { timestamp: 'desc' },
            include: {
                events: true,
                session: {
                    include: {
                        scribeSession: {
                            select: {
                                transcript: true,
                                clinicalNote: true
                            }
                        }
                    }
                }
            },
        }).catch(() => null);

        if (logs === null || logs === undefined) {
            // GovernanceLog doesn't exist yet, return empty array
            return NextResponse.json({
                data: [],
                message: 'Governance tables not yet migrated. Run prisma db push.'
            });
        }

        // Transform logs to the expected format
        const formattedLogs = logs.map((log: any) => ({
            id: log.id,
            createdAt: log.timestamp?.toISOString() || log.createdAt?.toISOString(),
            provider: log.modelUsed || 'gpt-4o-mini',
            safetyScore: log.safetyScore ?? 100,
            latencyMs: log.latencyMs ?? 0,
            session: log.session ? {
                user: { email: log.session.user?.email || 'unknown' },
                patient: log.session.patient || null
            } : null,
            events: (log.events || []).map((e: any) => ({
                id: e.id,
                ruleName: e.ruleId || e.ruleName || 'Unknown Rule',
                severity: e.severity || 'PASS',
                actionTaken: e.resolution || e.actionTaken || 'NONE',
                description: e.summary || e.description || ''
            }))
        }));

        return NextResponse.json({ data: formattedLogs });
    } catch (error) {
        console.error('Failed to fetch governance logs:', error);
        return NextResponse.json({
            data: [],
            error: 'Failed to fetch governance logs'
        }, { status: 500 });
    }
}
