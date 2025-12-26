/**
 * Environment Variable Validation with Zod
 * Validates all required configuration at startup to fail fast
 */

import { z } from 'zod';

/**
 * Validation schemas
 */

// URL validation
const urlSchema = z.string().url();

// Email validation
const emailSchema = z.string().email();

// Hex string validation (for secrets)
const hexStringSchema = z.string().regex(/^[0-9a-fA-F]+$/, 'Must be a valid hex string');

// PostgreSQL connection string
const postgresUrlSchema = z
  .string()
  .regex(
    /^postgresql:\/\/.+/,
    'Must be a valid PostgreSQL connection string (postgresql://...)'
  );

// Redis connection string
const redisUrlSchema = z
  .string()
  .regex(/^redis:\/\/.+/, 'Must be a valid Redis connection string (redis://...)');

/**
 * Core environment schema
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // API server
  API_PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  API_HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: postgresUrlSchema,

  // Redis (required for BullMQ)
  REDIS_URL: redisUrlSchema,

  // S3/MinIO (required for document storage)
  S3_ENDPOINT: urlSchema,
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_REGION: z.string().min(1),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: urlSchema,

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Feature flags
  ENABLE_BLOCKCHAIN: z.enum(['true', 'false']).default('false'),
  ENABLE_IPFS: z.enum(['true', 'false']).default('false'),
  ENABLE_MEDPLUM: z.enum(['true', 'false']).default('false'),
});

/**
 * Medplum/FHIR-specific environment schema (conditionally required)
 */
const medplumEnvSchema = z.object({
  MEDPLUM_BASE_URL: urlSchema,
  MEDPLUM_CLIENT_ID: z.string().min(1),
  MEDPLUM_CLIENT_SECRET: z.string().min(20, 'MEDPLUM_CLIENT_SECRET must be at least 20 characters'),
  MEDPLUM_PROJECT_ID: z.string().min(1),
});

/**
 * Optional services (only validate if provider is set)
 */
const optionalEmailSchema = z.discriminatedUnion('EMAIL_PROVIDER', [
  z.object({
    EMAIL_PROVIDER: z.literal('resend'),
    RESEND_API_KEY: z.string().regex(/^re_[a-zA-Z0-9]+$/),
    FROM_EMAIL: emailSchema,
    FROM_NAME: z.string(),
  }),
  z.object({
    EMAIL_PROVIDER: z.literal('sendgrid'),
    SENDGRID_API_KEY: z.string().regex(/^SG\.[a-zA-Z0-9_-]+$/),
    FROM_EMAIL: emailSchema,
    FROM_NAME: z.string(),
  }),
  z.object({
    EMAIL_PROVIDER: z.literal('ses'),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_REGION: z.string(),
    FROM_EMAIL: emailSchema,
    FROM_NAME: z.string(),
  }),
]);

const optionalTwilioSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-z0-9]+$/),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TWILIO_PHONE_NUMBER: z.string().regex(/^\+\d{10,15}$/),
  TWILIO_WHATSAPP_NUMBER: z.string().regex(/^whatsapp:\+\d{10,15}$/),
});

const optionalCronSchema = z.object({
  CRON_SECRET: hexStringSchema.min(32, 'CRON_SECRET must be at least 32 hex characters'),
});

const optionalAISchema = z.object({
  ANTHROPIC_API_KEY: z.string().regex(/^sk-ant-[a-zA-Z0-9_-]+$/),
  DEEPGRAM_API_KEY: z.string().min(1),
  OLLAMA_BASE_URL: urlSchema.optional(),
});

/**
 * Validation result type
 */
export type ValidatedEnv = z.infer<typeof envSchema> & Partial<z.infer<typeof medplumEnvSchema>>;

/**
 * Validate environment variables
 */
export function validateEnv(): ValidatedEnv {
  console.log('🔍 Validating environment configuration...');

  try {
    // Parse core environment
    const coreEnv = envSchema.parse(process.env);

    // Conditionally parse Medplum config if enabled
    let medplumEnv: Partial<z.infer<typeof medplumEnvSchema>> = {};
    if (coreEnv.ENABLE_MEDPLUM === 'true') {
      try {
        medplumEnv = medplumEnvSchema.parse(process.env);
        console.log('✅ Medplum configuration validated');
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('❌ Medplum configuration validation failed:');
          error.errors.forEach((err) => {
            console.error(`  - ${err.path.join('.')}: ${err.message}`);
          });
          throw new Error('ENABLE_MEDPLUM=true but Medplum configuration is invalid');
        }
        throw error;
      }
    }

    // Optionally validate email config (non-blocking)
    if (process.env.EMAIL_PROVIDER) {
      try {
        optionalEmailSchema.parse(process.env);
        console.log(`✅ Email provider (${process.env.EMAIL_PROVIDER}) configuration validated`);
      } catch (error) {
        console.warn('⚠️  Email configuration invalid (non-critical):', (error as Error).message);
      }
    }

    // Optionally validate Twilio config (non-blocking)
    if (process.env.TWILIO_ACCOUNT_SID) {
      try {
        optionalTwilioSchema.parse(process.env);
        console.log('✅ Twilio configuration validated');
      } catch (error) {
        console.warn('⚠️  Twilio configuration invalid (non-critical):', (error as Error).message);
      }
    }

    // Optionally validate cron secret (warning in production)
    if (coreEnv.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
      console.warn('⚠️  CRON_SECRET not set in production - automated jobs are unprotected');
    } else if (process.env.CRON_SECRET) {
      try {
        optionalCronSchema.parse(process.env);
        console.log('✅ Cron security configuration validated');
      } catch (error) {
        console.error('❌ CRON_SECRET validation failed:', (error as Error).message);
        if (coreEnv.NODE_ENV === 'production') {
          throw new Error('CRON_SECRET is invalid in production environment');
        }
      }
    }

    // Optionally validate AI config (non-blocking)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        optionalAISchema.parse(process.env);
        console.log('✅ AI services configuration validated');
      } catch (error) {
        console.warn('⚠️  AI configuration invalid (non-critical):', (error as Error).message);
      }
    }

    console.log('✅ Core environment validation passed');
    return { ...coreEnv, ...medplumEnv };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });

      // Additional context for common errors
      if (error.errors.some((e) => e.path.includes('DATABASE_URL'))) {
        console.error('\n💡 Example: DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
      }
      if (error.errors.some((e) => e.path.includes('REDIS_URL'))) {
        console.error('\n💡 Example: REDIS_URL="redis://localhost:6379"');
      }
      if (error.errors.some((e) => e.path.includes('JWT_SECRET'))) {
        console.error('\n💡 Generate with: openssl rand -hex 32');
      }

      throw new Error('Environment validation failed. Check the errors above.');
    }
    throw error;
  }
}

/**
 * Production-specific validations
 */
export function validateProductionEnv(): void {
  const env = process.env;

  console.log('🔍 Running production-specific validations...');

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for default/insecure values
  if (env.JWT_SECRET?.includes('your-') || env.JWT_SECRET?.includes('change-in-production')) {
    errors.push('JWT_SECRET appears to be a placeholder value');
  }

  if (env.NEXTAUTH_SECRET?.includes('your-') || env.NEXTAUTH_SECRET?.includes('change-in-production')) {
    errors.push('NEXTAUTH_SECRET appears to be a placeholder value');
  }

  if (env.DATABASE_URL?.includes('localhost')) {
    warnings.push('DATABASE_URL points to localhost (expected managed database in production)');
  }

  if (env.REDIS_URL?.includes('localhost')) {
    warnings.push('REDIS_URL points to localhost (expected managed Redis in production)');
  }

  if (env.S3_ENDPOINT?.includes('localhost') || env.S3_ENDPOINT?.includes('minio')) {
    warnings.push('S3_ENDPOINT points to local MinIO (expected cloud storage in production)');
  }

  if (env.MEDPLUM_BASE_URL?.includes('localhost')) {
    warnings.push('MEDPLUM_BASE_URL points to localhost (expected hosted Medplum in production)');
  }

  if (env.MEDPLUM_CLIENT_SECRET?.includes('dev-secret') || env.MEDPLUM_CLIENT_SECRET?.includes('super-secure')) {
    errors.push('MEDPLUM_CLIENT_SECRET appears to be a development value');
  }

  // Check required production features
  if (!env.CRON_SECRET) {
    errors.push('CRON_SECRET is required in production to secure automated jobs');
  }

  if (!env.EMAIL_PROVIDER) {
    warnings.push('EMAIL_PROVIDER not set - email functionality will be disabled');
  }

  // Log results
  if (warnings.length > 0) {
    console.warn('⚠️  Production configuration warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (errors.length > 0) {
    console.error('❌ Production configuration errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error('Production environment validation failed');
  }

  console.log('✅ Production environment validation passed');
}

/**
 * Export validated environment variables (call this once at startup)
 */
export const env = validateEnv();

// Run production validations if in production mode
if (env.NODE_ENV === 'production') {
  validateProductionEnv();
}
