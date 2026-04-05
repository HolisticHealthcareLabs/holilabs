import { prisma } from '@/lib/prisma';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { performClustering, ClusteredItem } from '@/lib/ml/clustering';
import logger from '@/lib/logger';

interface EmbeddingContext {
    id: string; // AssuranceEvent ID
    text: string;
}

export async function runOverrideClustering(): Promise<void> {
    logger.info('[OverrideClustering] job_started');

    // 1. Fetch recent override events (last 30 days)
    // We only care about events where human disagreed with AI
    const overrides = await prisma.assuranceEvent.findMany({
        where: {
            humanOverride: true,
            clusterId: null, // Only process unclustered events
            createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
        },
        take: 1000, // Batch limit
    });

    if (overrides.length < 5) {
        logger.info('[OverrideClustering] insufficient_events', { count: overrides.length, min: 5 });
        return;
    }

    logger.info('[OverrideClustering] fetching_embeddings', { count: overrides.length });

    // 2. Generate embeddings for each override context
    const embeddingContexts: EmbeddingContext[] = [];
    const vectors: number[][] = [];

    for (const event of overrides) {
        try {
            // Construct a text representation of the override
            // We want to capture: "Context -> AI said X -> Human did Y because Z"
            const context = JSON.stringify(event.inputContextSnapshot);
            const aiRec = JSON.stringify(event.aiRecommendation);
            const human = JSON.stringify(event.humanDecision);
            const reason = event.overrideReason || 'No reason provided';

            const text = `Context: ${context}\nAI Recommendation: ${aiRec}\nHuman Decision: ${human}\nReason: ${reason}`;

            const vector = await generateEmbedding(text);

            embeddingContexts.push({ id: event.id, text });
            vectors.push(vector);
        } catch (err) {
            logger.error({ err, eventId: event.id }, '[OverrideClustering] Failed to generate embedding');
        }
    }

    if (vectors.length < 5) return;

    // 3. Cluster using k-means
    // Heuristic: k = sqrt(n/2), but capped at 20 clusters for manageability
    const k = Math.min(20, Math.max(2, Math.floor(Math.sqrt(vectors.length / 2))));

    logger.info('[OverrideClustering] clustering', { vectorCount: vectors.length, k });
    const result = performClustering(vectors, k);

    // 4. Group results and save to DB
    // We first group events by cluster index
    const clustersMap = new Map<number, string[]>(); // clusterIndex -> eventIds

    result.clusters.forEach((clusterIndex, i) => {
        const eventId = embeddingContexts[i].id;
        if (!clustersMap.has(clusterIndex)) {
            clustersMap.set(clusterIndex, []);
        }
        clustersMap.get(clusterIndex)!.push(eventId);
    });

    // 5. Create cluster records
    for (const [clusterIndex, eventIds] of clustersMap.entries()) {
        if (eventIds.length < 2) continue; // Ignore singletons (noise)

        const centroid = result.centroids[clusterIndex];

        await prisma.$transaction(async (tx) => {
            // Create the cluster
            const cluster = await tx.overrideCluster.create({
                data: {
                    centroid: centroid,
                    frequency: eventIds.length,
                    silhouetteScore: 0.7, // Placeholder - implementing real silhouette score is expensive
                    actionRate: 0.0, // Calculated later
                    // Link events
                    events: {
                        connect: eventIds.map(id => ({ id })),
                    }
                }
            });

            logger.info('[OverrideClustering] cluster_created', { clusterId: cluster.id, eventCount: eventIds.length });
        });
    }

    logger.info('[OverrideClustering] job_complete');
}
