/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns 200 OK if app is healthy, 503 Service Unavailable if not
 *
 * Used by:
 * - DigitalOcean health checks
 * - Monitoring services
 * - Load balancers
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: {
        database: boolean;
        databaseLatency?: number;
    };
    version?: string;
}
export declare function GET(): Promise<NextResponse<HealthStatus>>;
export {};
//# sourceMappingURL=route.d.ts.map