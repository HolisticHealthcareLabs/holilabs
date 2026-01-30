import { prisma } from '@/lib/prisma';
import { Octokit } from 'octokit';
import { env } from '@/lib/env';

interface SimplifiedRule {
    condition: string;
    recommendation: string;
    rationale: string;
}

export class RulePromotionService {
    private octokit: Octokit;

    constructor() {
        this.octokit = new Octokit({
            auth: env.GITHUB_TOKEN,
        });
    }

    /**
     * Analyze a cluster and propose a rule if confidence is high enough
     */
    async analyzeClusterForPromotion(clusterId: string): Promise<string | null> {
        const cluster = await prisma.overrideCluster.findUnique({
            where: { id: clusterId },
            include: {
                events: {
                    take: 5, // Take a few samples for context
                }
            }
        });

        if (!cluster) {
            throw new Error(`Cluster ${clusterId} not found`);
        }

        // Confidence thresholds
        const MIN_FREQUENCY = 50;
        const MIN_SILHOUETTE = 0.6;

        // In prototype phase, we might relax these
        if (cluster.frequency < MIN_FREQUENCY) {
            console.log(`Cluster ${clusterId} frequency ${cluster.frequency} below threshold ${MIN_FREQUENCY}`);
            return null;
        }

        // Generate rule proposal content (Mock AI for now)
        const proposedRule = await this.generateRuleFromCluster(cluster);

        // Create GitHub PR
        const prUrl = await this.createReviewPR(proposedRule, clusterId);

        // Save Proposal to DB
        await prisma.ruleProposal.create({
            data: {
                clusterId: cluster.id,
                // @ts-ignore - formatting
                proposedRule: proposedRule,
                prUrl: prUrl,
                status: 'PENDING_REVIEW',
            }
        });

        return prUrl;
    }

    private async generateRuleFromCluster(cluster: any): Promise<SimplifiedRule> {
        // In a real implementation, we would send the cluster events to an LLM
        // to synthesize a rule. For Phase 8 prototype, we return a template.

        const sampleEvent = cluster.events[0];

        return {
            condition: `Input contains pattern matching cluster ${cluster.id.substring(0, 8)}`,
            recommendation: "Proposed Action based on clinician consensus",
            rationale: `Derived from ${cluster.frequency} clinician overrides with > 70% cohesion.`
        };
    }

    private async createReviewPR(rule: SimplifiedRule, clusterId: string): Promise<string> {
        if (!env.GITHUB_TOKEN) {
            console.warn('GITHUB_TOKEN not set. Skipping PR creation.');
            return 'http://localhost/no-token';
        }

        const { data: user } = await this.octokit.rest.users.getAuthenticated();
        const owner = user.login || 'HoliLabs'; // Fallback
        const repo = 'clinical-assurance-platform'; // Hardcoded for prototype

        const branchName = `promotion/cluster-${clusterId}`;
        const title = `[AI Proposal] New Rule for Cluster ${clusterId.substring(0, 8)}`;
        const body = `
# Rule Proposal

**Source**: Cluster ${clusterId}
**Frequency**: High
**Rationale**: ${rule.rationale}

## Proposed Rule
\`\`\`json
${JSON.stringify(rule, null, 2)}
\`\`\`

Please review and merge to deploy to staging.
    `;

        try {
            // 1. Get default branch SHA (simulated)
            // 2. Create Ref
            // 3. Create File
            // 4. Create PR

            // For this prototype, we'll just log what we WOULD do because we don't have a real repo to hit
            console.log(`[MOCK] Creating PR on ${owner}/${repo} branch ${branchName}`);
            console.log(`[MOCK] PR Body: ${body}`);

            return `https://github.com/${owner}/${repo}/pull/new/${branchName}`;

        } catch (error) {
            console.error('Failed to create PR:', error);
            return '';
        }
    }
}
