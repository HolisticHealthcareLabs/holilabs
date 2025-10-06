/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on app startup.
 * Fails fast with clear error messages if any are missing.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),

  // Authentication (Supabase)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Encryption (CRITICAL - for OAuth tokens)
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be exactly 64 characters (hex)'),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().min(1, 'NEXT_PUBLIC_APP_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Calendar OAuth (warn if missing in production)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // Optional: Email
  RESEND_API_KEY: z.string().optional(),

  // Optional: Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Optional: Redis (will be required soon)
  REDIS_URL: z.string().optional(),

  // Optional: Security
  CSRF_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Call this in next.config.js or at app startup
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);

    // Production-specific warnings
    if (env.NODE_ENV === 'production') {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️  WARNING: Google Calendar OAuth not configured');
      }
      if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
        console.warn('⚠️  WARNING: Microsoft Outlook OAuth not configured');
      }
      if (!env.REDIS_URL) {
        console.warn('⚠️  WARNING: REDIS_URL not set - rate limiting will not work across instances');
      }
      if (!env.CSRF_SECRET) {
        console.warn('⚠️  WARNING: CSRF_SECRET not set - using default (insecure)');
      }
      if (!env.NEXT_PUBLIC_SENTRY_DSN) {
        console.warn('⚠️  WARNING: Sentry not configured - errors will not be tracked');
      }
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment variable validation failed:\n');
      error.errors.forEach((err) => {
        console.error(`  • ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n📝 Please check your .env file and ensure all required variables are set.\n');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Safe to use after validateEnv() has been called
 */
export const env = validateEnv();
