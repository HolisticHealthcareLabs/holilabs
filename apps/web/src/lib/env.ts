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

import { z } from 'zod';
import { logger } from '@/lib/logger';

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database (Optional during build, required at runtime)
  DATABASE_URL: z.string().url().optional(),

  // Authentication (Supabase) - REQUIRED
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g., https://xxx.supabase.co)',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for authentication',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Encryption (CRITICAL - for OAuth tokens)
  ENCRYPTION_KEY: z.string().length(64, {
    message: 'ENCRYPTION_KEY must be exactly 64 characters (hex). Generate with: openssl rand -hex 32',
  }).optional(),

  // Application URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Security
  NEXTAUTH_SECRET: z.string().min(32, {
    message: 'NEXTAUTH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32',
  }).optional(),
  CSRF_SECRET: z.string().optional(),
  DEID_SECRET: z.string().min(16).optional(),

  // Calendar OAuth (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // Email Service (Optional)
  RESEND_API_KEY: z.string().startsWith('re_', {
    message: 'RESEND_API_KEY must start with "re_"',
  }).optional(),

  // AI Services (Optional)
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),

  // Monitoring (Optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),

  // Redis (Optional - for when we add Upstash)
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Blockchain (Optional)
  ENABLE_BLOCKCHAIN: z.enum(['true', 'false']).default('false'),
  POLYGON_RPC_URL: z.string().url().optional(),
  HEALTH_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  BLOCKCHAIN_PRIVATE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validate environment variables
 * Call this at app startup (not during build)
 *
 * @param options.skipDatabaseCheck - Skip DATABASE_URL validation (useful during build)
 * @param options.exitOnError - Exit process on validation failure (default: true in production)
 */
export function validateEnv(options?: {
  skipDatabaseCheck?: boolean;
  exitOnError?: boolean;
}): Env {
  // Return cached result if already validated
  if (cachedEnv) {
    return cachedEnv;
  }

  const startTime = Date.now();
  const exitOnError = options?.exitOnError ?? (process.env.NODE_ENV === 'production');

  try {
    logger.info({ event: 'env_validation_start' }, 'Validating environment variables...');

    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      // Format validation errors
      const errors = parsed.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        received: process.env[err.path[0] as string] ? '[REDACTED]' : 'undefined',
      }));

      logger.error({
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
      const warnings: string[] = [];

      if (!env.DATABASE_URL) {
        warnings.push('DATABASE_URL not set - database features will not work');
      }

      if (!env.ENCRYPTION_KEY) {
        warnings.push('ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted (security risk!)');
      }

      if (!env.NEXTAUTH_SECRET) {
        warnings.push('NEXTAUTH_SECRET not set - sessions may not be secure');
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
        logger.warn({
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
    logger.info({
      event: 'env_validation_success',
      duration,
      nodeEnv: env.NODE_ENV,
      hasDatabaseUrl: !!env.DATABASE_URL,
      hasSupabase: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasEncryption: !!env.ENCRYPTION_KEY,
      hasRedis: !!(env.REDIS_URL || env.UPSTASH_REDIS_REST_URL),
    }, 'Environment validation passed');

    return env;
  } catch (error) {
    logger.error({
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
export function getEnv(): Env {
  if (!cachedEnv) {
    // During build, skip database check
    return validateEnv({ skipDatabaseCheck: process.env.NODE_ENV !== 'production' });
  }
  return cachedEnv;
}

/**
 * Check if a specific optional feature is enabled
 */
export function isFeatureEnabled(feature: keyof Env): boolean {
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
export function getRequiredEnv(key: keyof Env): string {
  const env = getEnv();
  const value = env[key];

  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value as string;
}

// Export the schema for testing/documentation
export { envSchema };
