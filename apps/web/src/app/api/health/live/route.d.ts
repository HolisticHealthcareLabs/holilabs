/**
 * Liveness Health Check
 *
 * GET /api/health/live
 * Kubernetes liveness probe - checks if the application is running
 * Should return 200 if the process is alive
 * Does NOT check external dependencies
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare function GET(): Promise<NextResponse<{
    status: string;
    timestamp: string;
    uptime: number;
    pid: number;
    nodeVersion: string;
    platform: NodeJS.Platform;
    arch: NodeJS.Architecture;
    memory: {
        rss: string;
        heapTotal: string;
        heapUsed: string;
        external: string;
    };
}>>;
//# sourceMappingURL=route.d.ts.map