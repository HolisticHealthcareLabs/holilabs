"use strict";
/**
 * Liveness Health Check
 *
 * GET /api/health/live
 * Kubernetes liveness probe - checks if the application is running
 * Should return 200 if the process is alive
 * Does NOT check external dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
exports.dynamic = 'force-dynamic';
async function GET() {
    // Simple liveness check - if we can respond, we're alive
    return server_1.NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            external: Math.round(process.memoryUsage().external / 1024 / 1024) + 'MB',
        },
    }, { status: 200 });
}
//# sourceMappingURL=route.js.map