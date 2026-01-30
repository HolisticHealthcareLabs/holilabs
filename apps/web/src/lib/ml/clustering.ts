import { kmeans } from 'ml-kmeans';

export interface ClusterResult {
    clusters: number[]; // Cluster index for each input vector
    centroids: number[][]; // Center of each cluster
}

export interface ClusteredItem<T> {
    item: T;
    clusterIndex: number;
}

/**
 * Performs K-Means clustering on a set of vectors.
 * 
 * @param vectors Array of numeric vectors (embeddings)
 * @param k Number of clusters
 * @returns Clustering result
 */
export function performClustering(vectors: number[][], k: number): ClusterResult {
    if (vectors.length === 0) {
        return { clusters: [], centroids: [] };
    }

    // Handle case where k > vectors.length
    if (k > vectors.length) {
        console.warn(`Requested k=${k} is larger than dataset size=${vectors.length}. Adjusting k to ${vectors.length}.`);
        k = vectors.length;
    }

    const result = kmeans(vectors, k, {
        maxIterations: 100,
        tolerance: 1e-6,
    });

    return {
        clusters: result.clusters,
        centroids: result.centroids.map(c => Array.from(c)), // Ensure compatible array type
    };
}

/**
 * Calculates Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

/**
 * Validates if the vectors are of uniform dimension
 */
export function validateDimensions(vectors: number[][]): boolean {
    if (vectors.length === 0) return true;
    const dim = vectors[0].length;
    return vectors.every(v => v.length === dim);
}
