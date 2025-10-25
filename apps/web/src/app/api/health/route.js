"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/lib/prisma");
const logger_1 = require("@/lib/logger");
exports.dynamic = 'force-dynamic';
async function GET() {
    const startTime = Date.now();
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: false,
        },
        version: process.env.npm_package_version || '1.0.0',
    };
    try {
        // If Prisma client is not initialized (DATABASE_URL not set), return basic health check
        if (!prisma_1.prisma) {
            logger_1.logger.warn({ event: 'health_check_no_db' }, 'Health check: No database configured');
            return server_1.NextResponse.json({
                ...healthStatus,
                error: 'DATABASE_URL not configured - database not available',
            }, { status: 200 });
        }
        // Check database connection using health check function
        const dbHealth = await (0, prisma_1.checkDatabaseHealth)();
        healthStatus.services.database = dbHealth.healthy;
        healthStatus.services.databaseLatency = dbHealth.latency;
        logger_1.logger.info({
            event: 'health_check',
            dbLatency: dbHealth.latency,
            dbHealthy: dbHealth.healthy,
            uptime: healthStatus.uptime,
        }, 'Health check completed');
        // If database is unhealthy or slow (>1000ms), mark as unhealthy
        if (!dbHealth.healthy || (dbHealth.latency && dbHealth.latency > 1000)) {
            healthStatus.status = 'unhealthy';
            logger_1.logger.warn({
                event: 'health_check_slow_db',
                dbLatency: dbHealth.latency,
                error: dbHealth.error,
            }, 'Database is unhealthy or slow');
            return server_1.NextResponse.json(healthStatus, { status: 503 });
        }
        // All checks passed
        return server_1.NextResponse.json(healthStatus, { status: 200 });
    }
    catch (error) {
        // Database connection failed
        healthStatus.status = 'unhealthy';
        healthStatus.services.database = false;
        logger_1.logger.error({
            event: 'health_check_failed',
            err: error,
        }, 'Health check failed - database connection error');
        return server_1.NextResponse.json({
            ...healthStatus,
            error: error.message || 'Database connection failed',
        }, { status: 503 });
    }
}
//# sourceMappingURL=route.js.map