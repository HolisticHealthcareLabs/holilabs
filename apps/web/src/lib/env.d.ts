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
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SUPABASE_URL: z.ZodString;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.ZodString;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    SUPABASE_CLIENT_ID: z.ZodOptional<z.ZodString>;
    SUPABASE_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    R2_ENDPOINT: z.ZodOptional<z.ZodString>;
    R2_REGION: z.ZodOptional<z.ZodString>;
    R2_BUCKET: z.ZodOptional<z.ZodString>;
    R2_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    R2_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    R2_PUBLIC_URL: z.ZodOptional<z.ZodString>;
    S3_ENDPOINT: z.ZodOptional<z.ZodString>;
    AWS_REGION: z.ZodOptional<z.ZodString>;
    S3_BUCKET: z.ZodOptional<z.ZodString>;
    AWS_ACCESS_KEY_ID: z.ZodOptional<z.ZodString>;
    AWS_SECRET_ACCESS_KEY: z.ZodOptional<z.ZodString>;
    S3_PUBLIC_URL: z.ZodOptional<z.ZodString>;
    ENCRYPTION_KEY: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_APP_URL: z.ZodOptional<z.ZodString>;
    NEXTAUTH_SECRET: z.ZodOptional<z.ZodString>;
    SESSION_SECRET: z.ZodOptional<z.ZodString>;
    ENCRYPTION_MASTER_KEY: z.ZodOptional<z.ZodString>;
    CSRF_SECRET: z.ZodOptional<z.ZodString>;
    DEID_SECRET: z.ZodOptional<z.ZodString>;
    ALLOWED_ORIGINS: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_ID: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    MICROSOFT_CLIENT_ID: z.ZodOptional<z.ZodString>;
    MICROSOFT_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    RESEND_API_KEY: z.ZodOptional<z.ZodString>;
    ANTHROPIC_API_KEY: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SENTRY_DSN: z.ZodOptional<z.ZodString>;
    SENTRY_AUTH_TOKEN: z.ZodOptional<z.ZodString>;
    SENTRY_ORG: z.ZodOptional<z.ZodString>;
    SENTRY_PROJECT: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_POSTHOG_KEY: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_POSTHOG_HOST: z.ZodDefault<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_REST_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_REST_TOKEN: z.ZodOptional<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    ENABLE_BLOCKCHAIN: z.ZodDefault<z.ZodEnum<["true", "false"]>>;
    POLYGON_RPC_URL: z.ZodOptional<z.ZodString>;
    HEALTH_CONTRACT_ADDRESS: z.ZodOptional<z.ZodString>;
    BLOCKCHAIN_PRIVATE_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    LOG_LEVEL: "info" | "warn" | "error" | "trace" | "fatal" | "debug";
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_POSTHOG_HOST: string;
    NODE_ENV: "development" | "production" | "test";
    ENABLE_BLOCKCHAIN: "false" | "true";
    DEID_SECRET?: string | undefined;
    REDIS_URL?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    UPSTASH_REDIS_REST_URL?: string | undefined;
    UPSTASH_REDIS_REST_TOKEN?: string | undefined;
    DATABASE_URL?: string | undefined;
    NEXTAUTH_SECRET?: string | undefined;
    SESSION_SECRET?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    ENCRYPTION_KEY?: string | undefined;
    RESEND_API_KEY?: string | undefined;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    SENTRY_AUTH_TOKEN?: string | undefined;
    NEXT_PUBLIC_POSTHOG_KEY?: string | undefined;
    R2_ENDPOINT?: string | undefined;
    R2_BUCKET?: string | undefined;
    R2_ACCESS_KEY_ID?: string | undefined;
    R2_SECRET_ACCESS_KEY?: string | undefined;
    NEXT_PUBLIC_APP_URL?: string | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
    S3_ENDPOINT?: string | undefined;
    R2_REGION?: string | undefined;
    AWS_REGION?: string | undefined;
    S3_BUCKET?: string | undefined;
    GOOGLE_CLIENT_ID?: string | undefined;
    GOOGLE_CLIENT_SECRET?: string | undefined;
    MICROSOFT_CLIENT_ID?: string | undefined;
    MICROSOFT_CLIENT_SECRET?: string | undefined;
    SUPABASE_CLIENT_ID?: string | undefined;
    SUPABASE_CLIENT_SECRET?: string | undefined;
    R2_PUBLIC_URL?: string | undefined;
    S3_PUBLIC_URL?: string | undefined;
    ENCRYPTION_MASTER_KEY?: string | undefined;
    CSRF_SECRET?: string | undefined;
    ALLOWED_ORIGINS?: string | undefined;
    SENTRY_ORG?: string | undefined;
    SENTRY_PROJECT?: string | undefined;
    POLYGON_RPC_URL?: string | undefined;
    HEALTH_CONTRACT_ADDRESS?: string | undefined;
    BLOCKCHAIN_PRIVATE_KEY?: string | undefined;
}, {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    DEID_SECRET?: string | undefined;
    LOG_LEVEL?: "info" | "warn" | "error" | "trace" | "fatal" | "debug" | undefined;
    REDIS_URL?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    UPSTASH_REDIS_REST_URL?: string | undefined;
    UPSTASH_REDIS_REST_TOKEN?: string | undefined;
    DATABASE_URL?: string | undefined;
    NEXTAUTH_SECRET?: string | undefined;
    SESSION_SECRET?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    ENCRYPTION_KEY?: string | undefined;
    RESEND_API_KEY?: string | undefined;
    NEXT_PUBLIC_SENTRY_DSN?: string | undefined;
    SENTRY_AUTH_TOKEN?: string | undefined;
    NEXT_PUBLIC_POSTHOG_KEY?: string | undefined;
    NEXT_PUBLIC_POSTHOG_HOST?: string | undefined;
    R2_ENDPOINT?: string | undefined;
    R2_BUCKET?: string | undefined;
    R2_ACCESS_KEY_ID?: string | undefined;
    R2_SECRET_ACCESS_KEY?: string | undefined;
    NEXT_PUBLIC_APP_URL?: string | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    AWS_ACCESS_KEY_ID?: string | undefined;
    AWS_SECRET_ACCESS_KEY?: string | undefined;
    S3_ENDPOINT?: string | undefined;
    R2_REGION?: string | undefined;
    AWS_REGION?: string | undefined;
    S3_BUCKET?: string | undefined;
    GOOGLE_CLIENT_ID?: string | undefined;
    GOOGLE_CLIENT_SECRET?: string | undefined;
    MICROSOFT_CLIENT_ID?: string | undefined;
    MICROSOFT_CLIENT_SECRET?: string | undefined;
    SUPABASE_CLIENT_ID?: string | undefined;
    SUPABASE_CLIENT_SECRET?: string | undefined;
    R2_PUBLIC_URL?: string | undefined;
    S3_PUBLIC_URL?: string | undefined;
    ENCRYPTION_MASTER_KEY?: string | undefined;
    CSRF_SECRET?: string | undefined;
    ALLOWED_ORIGINS?: string | undefined;
    SENTRY_ORG?: string | undefined;
    SENTRY_PROJECT?: string | undefined;
    ENABLE_BLOCKCHAIN?: "false" | "true" | undefined;
    POLYGON_RPC_URL?: string | undefined;
    HEALTH_CONTRACT_ADDRESS?: string | undefined;
    BLOCKCHAIN_PRIVATE_KEY?: string | undefined;
}>;
export type Env = z.infer<typeof envSchema>;
/**
 * Validate environment variables
 * Call this at app startup (not during build)
 *
 * @param options.skipDatabaseCheck - Skip DATABASE_URL validation (useful during build)
 * @param options.exitOnError - Exit process on validation failure (default: true in production)
 */
export declare function validateEnv(options?: {
    skipDatabaseCheck?: boolean;
    exitOnError?: boolean;
}): Env;
/**
 * Get validated environment variables
 * Returns cached result or validates if not done yet
 */
export declare function getEnv(): Env;
/**
 * Check if a specific optional feature is enabled
 */
export declare function isFeatureEnabled(feature: keyof Env): boolean;
/**
 * Get a required environment variable
 * Throws if not set
 */
export declare function getRequiredEnv(key: keyof Env): string;
export { envSchema };
//# sourceMappingURL=env.d.ts.map