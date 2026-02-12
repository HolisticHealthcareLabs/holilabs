/**
 * Environment Variable Validation using Zod
 *
 * This file validates all environment variables at build/runtime using Zod schemas.
 * Based on @t3-oss/env-nextjs patterns for type-safe environment variables.
 *
 * Features:
 * - Type-safe environment variables with full IntelliSense
 * - Fail-fast validation with clear error messages
 * - Separates server-side and client-side variables
 * - Documents all required and optional variables
 * - Prevents runtime crashes due to missing configuration
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const dbUrl = env.DATABASE_URL;
 */

// @ts-ignore - @next/env is an internal Next.js package without exported types
import { loadEnvConfig } from '@next/env';
import { z } from 'zod';

// Load environment variables from .env files
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// ============================================================================
// SERVER-SIDE ENVIRONMENT VARIABLES
// ============================================================================
// These are only accessible on the server (API routes, server components)
// NEVER expose these to the client!

const serverSchema = z.object({
  // ========================================
  // CRITICAL - REQUIRED IN PRODUCTION
  // ========================================

  // Database - REQUIRED at runtime, optional at build time
  DATABASE_URL: z.string().url({
    message: 'DATABASE_URL must be a valid PostgreSQL connection string',
  }).optional(),

  // NextAuth - REQUIRED for authentication
  NEXTAUTH_SECRET: z.string().min(32, {
    message: 'NEXTAUTH_SECRET must be at least 32 characters. Generate with: openssl rand -base64 32',
  }).optional(),

  // Session Security - REQUIRED
  SESSION_SECRET: z.string().min(32, {
    message: 'SESSION_SECRET must be at least 32 characters',
  }).optional(),

  // Encryption Keys - REQUIRED for data security
  ENCRYPTION_KEY: z.string().length(64, {
    message: 'ENCRYPTION_KEY must be exactly 64 characters (hex). Generate with: openssl rand -hex 32',
  }).optional().or(z.literal('')),

  ENCRYPTION_MASTER_KEY: z.string().min(32, {
    message: 'ENCRYPTION_MASTER_KEY must be at least 32 characters. Generate with: openssl rand -base64 32',
  }).optional().or(z.literal('')),

  // ========================================
  // AI SERVICES - REQUIRED FOR CDSS
  // ========================================
  // Primary AI Providers (at least one required)
  GOOGLE_AI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', {
    message: 'ANTHROPIC_API_KEY must start with "sk-ant-"',
  }).optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', {
    message: 'OPENAI_API_KEY must start with "sk-"',
  }).optional(),

  // GitHub - For Rule Promotion (Phase 8)
  // Required for creating Pull Requests automatically
  GITHUB_TOKEN: z.string().optional(),

  // AI Transcription Services
  DEEPGRAM_API_KEY: z.string().optional(),

  // De-identification gate (HIPAA/LGPD)
  // When true, the system must NOT allow raw transcripts to be persisted or sent to the UI/LLMs.
  REQUIRE_DEIDENTIFICATION: z.enum(['true', 'false']).default('true'),
  PRESIDIO_TIMEOUT_MS: z.string().regex(/^\d+$/).default('8000'),

  // AI Configuration
  AI_PRIMARY_PROVIDER: z.enum(['gemini', 'claude', 'openai']).default('gemini'),
  AI_FALLBACK_ENABLED: z.enum(['true', 'false']).default('true'),
  AI_CACHE_ENABLED: z.enum(['true', 'false']).default('true'),
  AI_CACHE_TTL: z.string().regex(/^\d+$/).default('86400'), // seconds
  AI_RATE_LIMIT_PER_USER: z.string().regex(/^\d+$/).default('50'),
  MAX_CONCURRENT_AI_REQUESTS: z.string().regex(/^\d+$/).default('10'),

  // AI Usage Quotas (Freemium Model)
  AI_FREE_TIER_LIMIT: z.string().regex(/^\d+$/).default('10'),
  AI_STARTER_TIER_LIMIT: z.string().regex(/^\d+$/).default('50'),
  AI_PRO_TIER_LIMIT: z.string().regex(/^\d+$/).default('999999'),
  AI_ENTERPRISE_TIER_LIMIT: z.string().regex(/^\d+$/).default('999999'),

  // Cost Monitoring
  AI_MONTHLY_BUDGET_USD: z.string().regex(/^\d+$/).default('100'),
  AI_ALERT_THRESHOLD_PERCENT: z.string().regex(/^\d+$/).default('80'),

  // ========================================
  // NOTIFICATIONS - SMS & WHATSAPP
  // ========================================
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+\d+$/).optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().regex(/^whatsapp:\+\d+$/).optional(),
  TWILIO_STATUS_CALLBACK_URL: z.string().url().optional(),

  // ========================================
  // EMAIL SERVICES
  // ========================================
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'ses', 'smtp']).default('resend'),
  // IMPORTANT: This must match a verified sender domain in your email provider (e.g., Resend Domains).
  // Resend will reject unverified domains (403).
  FROM_EMAIL: z.string().email().default('noreply@holilabs.xyz'),
  FROM_NAME: z.string().default('Holi Labs'),

  // Resend (Recommended)
  RESEND_API_KEY: z.string().startsWith('re_', {
    message: 'RESEND_API_KEY must start with "re_"',
  }).optional(),

  // SendGrid
  SENDGRID_API_KEY: z.string().startsWith('SG.').optional(),

  // AWS SES
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // ========================================
  // WEB PUSH NOTIFICATIONS
  // ========================================
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().email().optional(),

  // ========================================
  // PAYMENTS - STRIPE
  // ========================================
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // ========================================
  // MEXICAN TAX COMPLIANCE (CFDI)
  // ========================================
  HOLI_LABS_RFC: z.string().optional(),
  PAC_PROVIDER: z.enum(['finkok', 'sw-sapien', 'diverza', 'ecodex']).optional(),
  PAC_API_URL: z.string().url().optional(),
  PAC_USERNAME: z.string().optional(),
  PAC_PASSWORD: z.string().optional(),
  PAC_CERTIFICATE: z.string().optional(), // Base64-encoded CSD certificate
  PAC_PRIVATE_KEY: z.string().optional(), // Base64-encoded CSD private key
  PAC_PRIVATE_KEY_PASSWORD: z.string().optional(),

  // ========================================
  // REDIS - RATE LIMITING & CACHING
  // ========================================
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ========================================
  // CLOUD STORAGE - R2/S3
  // ========================================
  // Cloudflare R2 (Recommended)
  R2_ENDPOINT: z.string().url().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),

  // AWS S3 (Alternative)
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),

  // ========================================
  // ERROR MONITORING - SENTRY
  // ========================================
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING: z.string().optional(),

  // ========================================
  // MEDICAL LICENSE VERIFICATION
  // ========================================
  // Brazil - CFM
  CFM_API_KEY: z.string().optional(),
  INFOSIMPLES_API_TOKEN: z.string().optional(),
  CRM_API_KEY: z.string().optional(),

  // Argentina - REFEPS/SISA
  SISA_USERNAME: z.string().optional(),
  SISA_PASSWORD: z.string().optional(),

  // ========================================
  // TELEHEALTH VIDEO - LIVEKIT
  // ========================================
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_URL: z.string().url().optional(),

  // ========================================
  // BLOCKCHAIN (OPTIONAL)
  // ========================================
  PRIVATE_KEY: z.string().optional(),
  RPC_URL: z.string().url().optional(),

  // ========================================
  // SECURITY & CONFIGURATION
  // ========================================
  // Optional separate backend base URL (standalone API service).
  // If unset, browser flows should prefer same-origin Next.js API routes.
  API_BASE_URL: z.string().url().optional(),

  ALLOWED_ORIGINS: z.string().optional(), // Comma-separated list
  CRON_SECRET: z.string().min(32, {
    message: 'CRON_SECRET must be at least 32 characters. Generate with: openssl rand -hex 32',
  }).optional().or(z.literal('')),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // OAuth - Calendar Integration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // ========================================
  // AUTH & PARTNER INTEGRATIONS
  // ========================================
  AUTH_STRATEGY: z.enum(['credentials', 'oauth', 'magic-link']).default('credentials'),
  PHARMA_PARTNER_KEY: z.string().min(16, {
    message: 'PHARMA_PARTNER_KEY must be at least 16 characters',
  }).optional(),
});

// ============================================================================
// CLIENT-SIDE ENVIRONMENT VARIABLES
// ============================================================================
// These are exposed to the browser and must be prefixed with NEXT_PUBLIC_
// NEVER put secrets here!

const clientSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim().length === 0) {
        return undefined;
      }
      return value;
    },
    z.string().url({
      message: 'NEXT_PUBLIC_APP_URL must be a valid URL (e.g., https://holilabs.xyz)',
    }).default('http://localhost:3000')
  ),

  // Web Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  // Public API base URL for browser-originated requests that must hit a separate backend
  // (e.g., the optional standalone API service or Edge node).
  // Prefer leaving this unset and using same-origin API routes when possible.
  NEXT_PUBLIC_API_BASE_URL: z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim().length === 0) {
        return undefined;
      }
      return value;
    },
    z.string().url().optional()
  ),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().regex(/^pk_(test|live)_/).optional(),

  // Error Monitoring - Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // App Version
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),

  // Analytics - PostHog (HIPAA-compliant)
  NEXT_PUBLIC_POSTHOG_KEY: z.string().startsWith('phc_').optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
});

// ============================================================================
// COMBINED SCHEMA
// ============================================================================

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Merge server and client schemas
  ...serverSchema.shape,
  ...clientSchema.shape,
});

export type Env = z.infer<typeof envSchema>;

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

let cachedEnv: Env | null = null;

/**
 * Validates environment variables at build/runtime
 * Fails fast with clear error messages if validation fails
 *
 * @throws {Error} If validation fails in production
 */
function validateEnv(): Env {
  // Return cached result if already validated
  if (cachedEnv) {
    return cachedEnv;
  }

  const isServer = typeof window === 'undefined';
  const isProduction = process.env.NODE_ENV === 'production';
  const skipValidation =
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.SKIP_ENV_VALIDATION === 'true';

  try {
    // In unit tests, Next/Jest may load placeholder .env values that intentionally
    // don't pass strict production-style validation (e.g., ENCRYPTION_KEY length/prefix checks).
    // For tests we want the code to import without requiring full runtime config.
    if (skipValidation) {
      cachedEnv = {
        ...(process.env as any),
        NODE_ENV: (process.env.NODE_ENV as any) || 'test',
        REQUIRE_DEIDENTIFICATION: (process.env.REQUIRE_DEIDENTIFICATION as any) || 'true',
      } as Env;
      return cachedEnv;
    }

    // Parse all environment variables
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      // Format validation errors
      const errors = parsed.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        received: process.env[err.path[0] as string] ? '[REDACTED]' : 'undefined',
      }));

      console.error('\n❌ Environment Variable Validation Failed:\n');
      errors.forEach((err) => {
        console.error(`  • ${err.field}: ${err.message}`);
        if (err.received === 'undefined') {
          console.error(`    (Not set in environment)`);
        }
      });
      console.error('\n📖 See apps/web/.env.example for required variables\n');

      // Fail fast in production
      if (isProduction && isServer) {
        process.exit(1);
      }

      throw new Error('Environment validation failed');
    }

    const env = parsed.data;

    if (!process.env.NEXT_PUBLIC_APP_URL && isServer && !isProduction && !skipValidation) {
      console.warn(
        'NEXT_PUBLIC_APP_URL is not set. Defaulting to http://localhost:3000 for local development.'
      );
    }

    // Runtime checks and warnings (production only, server-side only)
    if (isProduction && isServer) {
      const warnings: string[] = [];
      const criticalErrors: string[] = [];

      // CRITICAL: Security keys must be set in production
      if (!env.NEXTAUTH_SECRET) {
        criticalErrors.push('NEXTAUTH_SECRET not set - authentication will NOT work (CRITICAL!)');
      }
      if (!env.SESSION_SECRET) {
        criticalErrors.push('SESSION_SECRET not set - sessions will NOT be secure (CRITICAL!)');
      }
      if (!env.ENCRYPTION_KEY) {
        criticalErrors.push('ENCRYPTION_KEY not set - OAuth tokens will NOT be encrypted (CRITICAL!)');
      }
      if (!env.ENCRYPTION_MASTER_KEY) {
        criticalErrors.push('ENCRYPTION_MASTER_KEY not set - file encryption will NOT work (CRITICAL!)');
      }

      // Database
      if (!env.DATABASE_URL) {
        warnings.push('DATABASE_URL not set - database features will not work');
      }

      // AI Services (at least one required)
      if (!env.GOOGLE_AI_API_KEY && !env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
        warnings.push('No AI provider configured - CDSS features will not work');
      }

      // Cloud Storage
      if (!env.R2_ACCESS_KEY_ID && !env.AWS_ACCESS_KEY_ID) {
        warnings.push('Cloud storage (R2/S3) not configured - files will be stored locally (NOT production-ready)');
      }

      // Email
      if (!env.RESEND_API_KEY && !env.SENDGRID_API_KEY && !env.AWS_ACCESS_KEY_ID) {
        warnings.push('No email provider configured - email features will not work');
      }

      // Redis
      if (!env.UPSTASH_REDIS_REST_URL) {
        warnings.push('Redis not configured - rate limiting will not scale across instances');
      }

      // Error Monitoring
      if (!env.NEXT_PUBLIC_SENTRY_DSN) {
        warnings.push('Sentry not configured - errors will not be tracked');
      }

      // CORS
      if (!env.ALLOWED_ORIGINS) {
        warnings.push('ALLOWED_ORIGINS not set - CORS may block legitimate requests');
      }

      // Pharma Partner
      if (!env.PHARMA_PARTNER_KEY) {
        warnings.push('PHARMA_PARTNER_KEY not set - pharma partner integrations will not work');
      }

      // Print critical errors and exit
      if (criticalErrors.length > 0) {
        console.error('\n🚨 CRITICAL PRODUCTION ERRORS:\n');
        criticalErrors.forEach((error) => {
          console.error(`  • ${error}`);
        });
        console.error('\n');
        process.exit(1);
      }

      // Print warnings
      if (warnings.length > 0) {
        console.warn('\n⚠️  Production Environment Warnings:\n');
        warnings.forEach((warning) => {
          console.warn(`  • ${warning}`);
        });
        console.warn('\n');
      }
    }

    // Cache the validated result
    cachedEnv = env;

    if (isServer) {
      console.log('✅ Environment validation passed');
    }

    return env;
  } catch (error) {
    if (isProduction && isServer) {
      console.error('❌ Unexpected error during environment validation:', error);
      process.exit(1);
    }
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Type-safe environment variables
 * Validated once at import time
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const dbUrl = env.DATABASE_URL;
 */
export const env = validateEnv();

/**
 * Export schemas for testing/documentation
 */
export { serverSchema, clientSchema, envSchema };

/**
 * Helper: Check if a feature is enabled
 */
export function isFeatureEnabled(key: keyof Env): boolean {
  const value = env[key];

  if (value === undefined || value === null || value === '') {
    return false;
  }

  if (typeof value === 'string' && (value.toLowerCase() === 'false' || value === '0')) {
    return false;
  }

  return true;
}

/**
 * Helper: Get a required environment variable
 * Throws if not set
 */
export function getRequiredEnv(key: keyof Env): string {
  const value = env[key];

  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value as string;
}

/**
 * Helper: Parse numeric environment variable
 */
export function getNumericEnv(key: keyof Env, defaultValue: number): number {
  const value = env[key];

  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value as string, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Helper: Parse boolean environment variable
 */
export function getBooleanEnv(key: keyof Env, defaultValue: boolean): boolean {
  const value = env[key];

  if (!value) {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}
