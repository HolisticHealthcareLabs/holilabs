/**
 * Readiness Health Check
 *
 * GET /api/health/ready
 * Kubernetes readiness probe - checks if the application can serve traffic
 * Verifies connectivity to external dependencies:
 * - Database (PostgreSQL)
 * - Redis (Upstash) - optional
 * - Supabase - optional
 *
 * Returns 200 if ready, 503 if not ready
 */
import { NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
/**
 * Main health check handler
 */
export declare function GET(): Promise<NextResponse<{
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    responseTime: string;
    checks: Record<string, any>;
}> | NextResponse<{
    status: string;
    timestamp: string;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map