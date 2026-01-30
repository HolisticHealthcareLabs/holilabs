declare module 'ml-kmeans' {
    export interface KMeansOptions {
        maxIterations?: number;
        tolerance?: number;
        initialization?: 'kmeans++' | 'random' | Array<number[]>;
        seed?: number;
    }

    export interface KMeansResult {
        clusters: number[];
        centroids: number[][];
        iterations: number;
    }

    export function kmeans(
        data: number[][],
        k: number,
        options?: KMeansOptions
    ): KMeansResult;
}
