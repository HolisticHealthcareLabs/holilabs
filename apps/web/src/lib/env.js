"use strict";
/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on app startup.
 * Fails fast with clear error messages if any are missing.
 *
 * Benefits:
 * - Type-safe environment variables
 * - Prevents runtime crashes due to missing config
 * - Clear error messages for debugging
 * - Documents all env vars in one place
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
exports.getEnv = getEnv;
exports.isFeatureEnabled = isFeatureEnabled;
exports.getRequiredEnv = getRequiredEnv;
const zod_1 = require("zod");
const logger_1 = require("@/lib/logger");
const envSchema = zod_1.z.object({
    // Node Environment
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Database (Optional during build, required at runtime)
    DATABASE_URL: zod_1.z.string().url().optional(),
    // Authentication (Supabase) - REQUIRED
    NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url({
        message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g., https://xxx.supabase.co)',
    }),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().min(1, {
        message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for authentication',
    }),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1).optional(),
    SUPABASE_CLIENT_ID: zod_1.z.string().optional(),
    SUPABASE_CLIENT_SECRET: zod_1.z.string().optional(),
    // Cloud Storage (S3/Cloudflare R2) - Optional
    R2_ENDPOINT: zod_1.z.string().url().optional(),
    R2_REGION: zod_1.z.string().optional(),
    R2_BUCKET: zod_1.z.string().optional(),
    R2_ACCESS_KEY_ID: zod_1.z.string().optional(),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    R2_PUBLIC_URL: zod_1.z.string().url().optional(),
    // AWS S3 (alternative to R2)
    S3_ENDPOINT: zod_1.z.string().url().optional(),
    AWS_REGION: zod_1.z.string().optional(),
    S3_BUCKET: zod_1.z.string().optional(),
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    S3_PUBLIC_URL: zod_1.z.string().url().optional(),
    // Encryption (CRITICAL - for OAuth tokens)
    ENCRYPTION_KEY: zod_1.z.string().length(64, {
        message: 'ENCRYPTION_KEY must be exactly 64 characters (hex). Generate with: openssl rand -hex 32',
    }).optional(),
    // Application URL
    NEXT_PUBLIC_APP_URL: zod_1.z.string().url().optional(),
    // Security - CRITICAL in production
    NEXTAUTH_SECRET: zod_1.z.string().min(32, {
        message: 'NEXTAUTH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32',
    }).optional(),
    SESSION_SECRET: zod_1.z.string().min(32, {
        message: 'SESSION_SECRET must be at least 32 characters (used for patient sessions)',
    }).optional(),
    ENCRYPTION_MASTER_KEY: zod_1.z.string().min(32, {
        message: 'ENCRYPTION_MASTER_KEY must be at least 32 characters (for file encryption)',
    }).optional(),
    CSRF_SECRET: zod_1.z.string().optional(),
    DEID_SECRET: zod_1.z.string().min(16).optional(),
    // CORS Configuration
    ALLOWED_ORIGINS: zod_1.z.string().optional(), // Comma-separated list
    // Calendar OAuth (Optional)
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    MICROSOFT_CLIENT_ID: zod_1.z.string().optional(),
    MICROSOFT_CLIENT_SECRET: zod_1.z.string().optional(),
    // Email Service (Optional)
    RESEND_API_KEY: zod_1.z.string().startsWith('re_', {
        message: 'RESEND_API_KEY must start with "re_"',
    }).optional(),
    // AI Services (Optional)
    ANTHROPIC_API_KEY: zod_1.z.string().startsWith('sk-ant-').optional(),
    // Monitoring (Optional)
    NEXT_PUBLIC_SENTRY_DSN: zod_1.z.string().url().optional(),
    SENTRY_AUTH_TOKEN: zod_1.z.string().optional(),
    SENTRY_ORG: zod_1.z.string().optional(),
    SENTRY_PROJECT: zod_1.z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: zod_1.z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: zod_1.z.string().url().default('https://app.posthog.com'),
    // Redis (Optional - for when we add Upstash)
    REDIS_URL: zod_1.z.string().url().optional(),
    UPSTASH_REDIS_REST_URL: zod_1.z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: zod_1.z.string().optional(),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    // Blockchain (Optional)
    ENABLE_BLOCKCHAIN: zod_1.z.enum(['true', 'false']).default('false'),
    POLYGON_RPC_URL: zod_1.z.string().url().optional(),
    HEALTH_CONTRACT_ADDRESS: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    BLOCKCHAIN_PRIVATE_KEY: zod_1.z.string().optional(),
});
exports.envSchema = envSchema;
let cachedEnv = null;
/**
 * Validate environment variables
 * Call this at app startup (not during build)
 *
 * @param options.skipDatabaseCheck - Skip DATABASE_URL validation (useful during build)
 * @param options.exitOnError - Exit process on validation failure (default: true in production)
 */
function validateEnv(options) {
    // Return cached result if already validated
    if (cachedEnv) {
        return cachedEnv;
    }
    const startTime = Date.now();
    const exitOnError = options?.exitOnError ?? (process.env.NODE_ENV === 'production');
    try {
        logger_1.logger.info({ event: 'env_validation_start' }, 'Validating environment variables...');
        const parsed = envSchema.safeParse(process.env);
        if (!parsed.success) {
            // Format validation errors
            const errors = parsed.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                received: process.env[err.path[0]] ? '[REDACTED]' : 'undefined',
            }));
            logger_1.logger.error({
                event: 'env_validation_failed',
                errors,
            }, 'Environment validation failed');
            console.error('\n❌ Environment Variable Validation Failed:\n');
            errors.forEach((err) => {
                console.error(`  • ${err.field}: ${err.message}`);
                if (err.received === 'undefined') {
                    console.error(`    (Not set in environment)`);
                }
            });
            console.error('\n📖 See apps/web/.env.production.example for required variables\n');
            if (exitOnError) {
                process.exit(1);
            }
            throw new Error('Environment validation failed');
        }
        const env = parsed.data;
        // Runtime checks and warnings (only in production)
        if (env.NODE_ENV === 'production' && !options?.skipDatabaseCheck) {
            const warnings = [];
            if (!env.DATABASE_URL) {
                warnings.push('DATABASE_URL not set - database features will not work');
            }
            if (!env.ENCRYPTION_KEY) {
                warnings.push('ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted (security risk!)');
            }
            if (!env.NEXTAUTH_SECRET && !env.SESSION_SECRET) {
                warnings.push('NEXTAUTH_SECRET/SESSION_SECRET not set - sessions WILL NOT be secure (CRITICAL!)');
            }
            if (!env.ENCRYPTION_MASTER_KEY) {
                warnings.push('ENCRYPTION_MASTER_KEY not set - file encryption will NOT work (CRITICAL!)');
            }
            if (!env.R2_ACCESS_KEY_ID && !env.AWS_ACCESS_KEY_ID) {
                warnings.push('Cloud storage (R2/S3) not configured - files will be stored locally (NOT production-ready)');
            }
            if (!env.ALLOWED_ORIGINS) {
                warnings.push('ALLOWED_ORIGINS not set - CORS may block legitimate requests');
            }
            if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
                warnings.push('Google Calendar OAuth not configured');
            }
            if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
                warnings.push('Microsoft Outlook OAuth not configured');
            }
            if (!env.REDIS_URL && !env.UPSTASH_REDIS_REST_URL) {
                warnings.push('Redis not configured - rate limiting will not scale across instances');
            }
            if (!env.RESEND_API_KEY) {
                warnings.push('RESEND_API_KEY not set - email features will not work');
            }
            if (!env.NEXT_PUBLIC_SENTRY_DSN) {
                warnings.push('Sentry not configured - errors will not be tracked');
            }
            if (warnings.length > 0) {
                logger_1.logger.warn({
                    event: 'env_validation_warnings',
                    warnings,
                }, 'Environment validation passed with warnings');
                console.warn('\n⚠️  Production Environment Warnings:\n');
                warnings.forEach((warning) => {
                    console.warn(`  • ${warning}`);
                });
                console.warn('\n');
            }
        }
        // Cache the validated result
        cachedEnv = env;
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            event: 'env_validation_success',
            duration,
            nodeEnv: env.NODE_ENV,
            hasDatabaseUrl: !!env.DATABASE_URL,
            hasSupabase: !!env.NEXT_PUBLIC_SUPABASE_URL,
            hasEncryption: !!env.ENCRYPTION_KEY,
            hasRedis: !!(env.REDIS_URL || env.UPSTASH_REDIS_REST_URL),
        }, 'Environment validation passed');
        return env;
    }
    catch (error) {
        logger_1.logger.error({
            event: 'env_validation_error',
            err: error,
        }, 'Unexpected error during environment validation');
        if (exitOnError) {
            process.exit(1);
        }
        throw error;
    }
}
/**
 * Get validated environment variables
 * Returns cached result or validates if not done yet
 */
function getEnv() {
    if (!cachedEnv) {
        // During build, skip database check
        return validateEnv({ skipDatabaseCheck: process.env.NODE_ENV !== 'production' });
    }
    return cachedEnv;
}
/**
 * Check if a specific optional feature is enabled
 */
function isFeatureEnabled(feature) {
    const env = getEnv();
    const value = env[feature];
    if (value === undefined || value === null || value === '') {
        return false;
    }
    if (typeof value === 'string' && value.toLowerCase() === 'false') {
        return false;
    }
    return true;
}
/**
 * Get a required environment variable
 * Throws if not set
 */
function getRequiredEnv(key) {
    const env = getEnv();
    const value = env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}
//# sourceMappingURL=env.js.map