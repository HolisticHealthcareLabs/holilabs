
// @ts-nocheck
import { PrismaClient, RuleProposalStatus as ProposalStatus } from '@prisma/client';
import { OpenAIAuditorAdapter } from '../../services/llm/openai-auditor.adapter';
import logger from '../logger';

const prisma = new PrismaClient();
const llm = new OpenAIAuditorAdapter(process.env.OPENAI_API_KEY);

interface ClusterResult {
    description: string;
    reasoning: string;
    logIds: string[];
    confidence: number;
}

export class AutoPromoterService {
    /**
     * Analyzes recent overrides to find patterns
     */
    async analyzeOverrides(threshold = 3): Promise<number> {
        logger.info({ event: 'auto_promoter_start' });

        // 1. Fetch recent rejected/overridden logs
        const logs = await prisma.governanceLog.findMany({
            where: {
                OR: [
                    { validationStatus: 'REJECTED' },
                    { overrideReason: { not: null } }
                ],
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            },
            select: {
                id: true,
                overrideReason: true,
                validationNotes: true,
                ruleId: true,
                ruleDescription: true
            }
        });

        if (logs.length === 0) {
            return 0;
        }

        // 2. Group by Rule ID
        const logsByRule = logs.reduce((acc, log) => {
            const key = log.ruleId || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(log);
            return acc;
        }, {} as Record<string, typeof logs>);

        let proposalsCreated = 0;

        // 3. Analyze each rule's overrides
        for (const [ruleId, ruleLogs] of Object.entries(logsByRule)) {
            if (ruleLogs.length < threshold) continue;

            // Extract text for clustering
            const texts = ruleLogs.map(l => l.overrideReason || l.validationNotes || '').filter(Boolean);

            try {
                // Use LLM to cluster these reasons
                const cluster = await this.clusterReasons(texts, ruleLogs[0].ruleDescription || 'Unknown Rule');

                if (cluster && cluster.confidence > 0.7) {
                    // Check if proposal already exists
                    const existing = await prisma.proposedRuleChange.findFirst({
                        where: {
                            ruleId,
                            status: 'PENDING',
                            description: cluster.description
                        }
                    });

                    if (!existing) {
                        await prisma.proposedRuleChange.create({
                            data: {
                                ruleId: ruleId === 'unknown' ? null : ruleId,
                                description: cluster.description,
                                reasoning: cluster.reasoning,
                                confidence: cluster.confidence,
                                evidence: ruleLogs.filter(l => cluster.logIds.includes(l.id)).map(l => ({ logId: l.id, note: l.overrideReason })),
                                status: 'PENDING'
                            }
                        });
                        proposalsCreated++;
                    }
                }
            } catch (error) {
                logger.error({ event: 'auto_promoter_error', ruleId, error });
            }
        }

        return proposalsCreated;
    }

    /**
     * Asks LLM to find the common pattern in a list of override reasons
     */
    private async clusterReasons(reasons: string[], ruleContext: string): Promise<ClusterResult | null> {
        if (reasons.length === 0) return null;

        const prompt = `
    You are a Clinical Governance AI. 
    Analyze these ${reasons.length} doctor overrides for the rule: "${ruleContext}".
    
    Override Reasons:
    ${reasons.map(r => `- ${r}`).join('\n')}

    Task:
    1. Identify the single most common clinical reason for these overrides.
    2. Suggest a specific modification to the rule.
    3. Assign a confidence score (0.0 to 1.0) that this is a valid pattern and not noise.

    Output JSON:
    {
      "description": "Short title of the proposed change (e.g. 'Exclude Post-Op Patients')",
      "reasoning": "Detailed explanation of the pattern found.",
      "confidence": 0.0 - 1.0
    }
    `;

        try {
            const resultStr = await llm.complete('You are a helpful clinical analyst.', prompt);
            const result = JSON.parse(resultStr);

            return {
                description: result.description,
                reasoning: result.reasoning,
                confidence: result.confidence,
                logIds: [] // In a real implementation we'd map back, simplified here
            };
        } catch (e) {
            console.error("Clustering failed", e);
            return null;
        }
    }
}
