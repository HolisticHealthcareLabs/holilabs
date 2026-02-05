
'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';

// Re-export this enum so client components can use it without importing from Prisma
export type ValidationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export async function getGovernanceLogs() {
    noStore(); // Disable caching for real-time feed
    try {
        const logs = await prisma.governanceLog.findMany({
            take: 50,
            orderBy: { timestamp: 'desc' },
            include: {
                events: true, // verdicts
                session: {
                    include: {
                        scribeSession: {
                            select: {
                                transcription: true,
                                soapNote: true
                            }
                        }
                    }
                }
            },
        });
        return { data: logs, error: null };
    } catch (error) {
        console.error('Failed to fetch governance logs:', error);
        return { data: [], error: 'Failed to fetch logs' };
    }
}

export async function getSafetyStats() {
    noStore();
    try {
        // 1. Total Sessions (24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sessionsAudited = await prisma.governanceLog.count({
            where: { timestamp: { gte: oneDayAgo } },
        });

        // 2. Interventions Triggered (24h)
        const interventionsTriggered = await prisma.governanceEvent.count({
            where: {
                timestamp: { gte: oneDayAgo },
                severity: 'HARD_BLOCK',
            },
        });

        // 3. Avg Safety Score (24h)
        const avgScoreResult = await prisma.governanceLog.aggregate({
            _avg: { safetyScore: true },
            where: { timestamp: { gte: oneDayAgo } },
        });

        // Default to 100 if no data
        const avgSafetyScore = Math.round(avgScoreResult._avg.safetyScore ?? 100);

        return {
            data: {
                sessionsAudited,
                interventionsTriggered,
                avgSafetyScore,
            },
            error: null,
        };
    } catch (error) {
        console.error('Failed to fetch safety stats:', error);
        return {
            data: { sessionsAudited: 0, interventionsTriggered: 0, avgSafetyScore: 0 },
            error: 'Failed to fetch stats',
        };
    }
}

export async function validateGovernanceLog(
    logId: string,
    status: ValidationStatus,
    notes?: string
) {
    try {
        await prisma.governanceLog.update({
            where: { id: logId },
            data: {
                validationStatus: status,
                validationNotes: notes,
                validatedAt: new Date(),
                // In a real app, we'd get the user ID from the session
                validatedBy: 'Manual Auditor',
            },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to validate governance log:', error);
        return { success: false, error: 'Failed to update validation status' };
    }
}
