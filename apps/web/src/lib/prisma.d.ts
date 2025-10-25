/**
 * Prisma Client Singleton - Production-Ready Configuration
 *
 * Features:
 * - Connection pooling with configurable limits
 * - Automatic retry logic for failed connections
 * - Query logging in development
 * - Graceful shutdown handling
 * - Performance monitoring
 *
 * Connection Pool Settings:
 * - Default pool size: 10 connections
 * - Connection timeout: 10 seconds
 * - Query timeout: 15 seconds
 * - Pool timeout: 10 seconds
 */
import { PrismaClient } from '@prisma/client';
/**
 * Check database connection health
 */
export declare function checkDatabaseHealth(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
}>;
export declare const prisma: PrismaClient | null;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map