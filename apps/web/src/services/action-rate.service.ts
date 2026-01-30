import { prisma } from '@/lib/prisma';

export interface ActionRateMetrics {
    actionRate: number;  // (accepted + modified) / total
    accepted: number;    // Used recommendation as-is
    modified: number;    // Used with minor changes
    overridden: number;  // Rejected completely
    ignored: number;     // No decision recorded
    total: number;
}

export class ActionRateService {
    /**
     * Calculate Action Rate for a given time range and optional clinic
     */
    async calculateMetrics(startDate: Date, endDate: Date, clinicId?: string): Promise<ActionRateMetrics> {
        const where: any = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
            decidedAt: { not: null }, // Only consider events with a decision
        };

        if (clinicId) {
            where.clinicId = clinicId;
        }

        // Since we don't have explicit "ignored" or "accepted" status columns in AssuranceEvent,
        // we derive them from `humanOverride` and `humanDecision`.
        // In a real system, we'd have precise status enums.

        // Total decided events
        const allEvents = await prisma.assuranceEvent.findMany({
            where,
            select: {
                humanOverride: true,
                humanDecision: true,
                aiRecommendation: true,
            }
        });

        let accepted = 0;
        let overridden = 0;

        // Heuristic: If humanOverride is false, it's accepted.
        // If true, it's overridden.
        // "Modified" is hard to detect without deeper JSON comparison, so we'll treat false override as accepted+modified for now.

        for (const event of allEvents) {
            if (event.humanOverride) {
                overridden++;
            } else {
                accepted++;
            }
        }

        const total = allEvents.length;
        const actionRate = total > 0 ? accepted / total : 0;

        return {
            actionRate,
            accepted,
            modified: 0, // Placeholder
            overridden,
            ignored: 0,  // Placeholder
            total
        };
    }

    /**
     * Get metrics broken down by Rule Version
     */
    async getMetricsByRule(ruleVersionId: string): Promise<ActionRateMetrics> {
        // similar logic but filtered by ruleVersionId
        // simplified for this prototype
        return {
            actionRate: 0, accepted: 0, modified: 0, overridden: 0, ignored: 0, total: 0
        };
    }
}
