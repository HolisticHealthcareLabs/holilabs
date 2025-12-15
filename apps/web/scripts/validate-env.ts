#!/usr/bin/env tsx
/**
 * Standalone Environment Variable Validation Script
 *
 * This script validates all environment variables using the Zod schema
 * without starting the application. Perfect for CI/CD pipelines.
 *
 * Usage:
 *   pnpm run validate:env          # Standard validation
 *   tsx scripts/validate-env.ts    # Direct execution
 *
 * Exit codes:
 *   0 - All validation passed
 *   1 - Validation failed
 */

import { env, envSchema, isFeatureEnabled } from '../src/lib/env';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
  log('\n🔍 Environment Variable Validation\n', 'bold');

  const isProduction = process.env.NODE_ENV === 'production';
  const isCI = process.env.CI === 'true';

  log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`, 'cyan');
  log(`CI Mode: ${isCI ? 'YES' : 'NO'}`, 'cyan');
  log('', 'reset');

  try {
    // Validation already happened when we imported env
    // If we got here, validation passed

    log('✅ Environment validation passed', 'green');
    log('', 'reset');

    // Count configured features
    const features = {
      database: isFeatureEnabled('DATABASE_URL'),
      supabase: isFeatureEnabled('SUPABASE_SERVICE_ROLE_KEY'),
      encryption: isFeatureEnabled('ENCRYPTION_KEY'),
      nextAuth: isFeatureEnabled('NEXTAUTH_SECRET'),
      sessionSecret: isFeatureEnabled('SESSION_SECRET'),
      encryptionMaster: isFeatureEnabled('ENCRYPTION_MASTER_KEY'),

      // AI Services
      gemini: isFeatureEnabled('GOOGLE_AI_API_KEY'),
      claude: isFeatureEnabled('ANTHROPIC_API_KEY'),
      openai: isFeatureEnabled('OPENAI_API_KEY'),
      assemblyAI: isFeatureEnabled('ASSEMBLYAI_API_KEY'),
      deepgram: isFeatureEnabled('DEEPGRAM_API_KEY'),

      // Notifications
      email: isFeatureEnabled('RESEND_API_KEY') ||
             isFeatureEnabled('SENDGRID_API_KEY') ||
             isFeatureEnabled('AWS_ACCESS_KEY_ID'),
      sms: isFeatureEnabled('TWILIO_ACCOUNT_SID'),
      whatsapp: isFeatureEnabled('TWILIO_WHATSAPP_NUMBER'),
      webPush: isFeatureEnabled('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),

      // Infrastructure
      redis: isFeatureEnabled('UPSTASH_REDIS_REST_URL'),
      r2Storage: isFeatureEnabled('R2_ACCESS_KEY_ID'),
      s3Storage: isFeatureEnabled('S3_BUCKET'),

      // Monitoring
      sentry: isFeatureEnabled('NEXT_PUBLIC_SENTRY_DSN'),
      posthog: isFeatureEnabled('NEXT_PUBLIC_POSTHOG_KEY'),

      // Payments
      stripe: isFeatureEnabled('STRIPE_SECRET_KEY'),

      // Security
      cors: isFeatureEnabled('ALLOWED_ORIGINS'),
      cronSecret: isFeatureEnabled('CRON_SECRET'),
    };

    // Display feature status
    log('📊 Feature Configuration:', 'bold');
    log('', 'reset');

    // Critical Features
    log('🔐 Critical Security:', 'cyan');
    displayFeature('NextAuth Secret', features.nextAuth);
    displayFeature('Session Secret', features.sessionSecret);
    displayFeature('Encryption Key', features.encryption);
    displayFeature('Master Encryption Key', features.encryptionMaster);
    log('', 'reset');

    // Core Infrastructure
    log('🗄️  Core Infrastructure:', 'cyan');
    displayFeature('Database', features.database);
    displayFeature('Supabase', features.supabase);
    log('', 'reset');

    // AI Services
    log('🤖 AI Services:', 'cyan');
    displayFeature('Google Gemini', features.gemini);
    displayFeature('Anthropic Claude', features.claude);
    displayFeature('OpenAI GPT', features.openai);
    displayFeature('AssemblyAI', features.assemblyAI);
    displayFeature('Deepgram', features.deepgram);
    log('', 'reset');

    // Notifications
    log('📧 Notifications:', 'cyan');
    displayFeature('Email Service', features.email);
    displayFeature('SMS (Twilio)', features.sms);
    displayFeature('WhatsApp', features.whatsapp);
    displayFeature('Web Push', features.webPush);
    log('', 'reset');

    // Infrastructure
    log('☁️  Cloud Services:', 'cyan');
    displayFeature('Redis Cache', features.redis);
    displayFeature('R2 Storage', features.r2Storage);
    displayFeature('S3 Storage', features.s3Storage);
    log('', 'reset');

    // Monitoring
    log('📊 Monitoring:', 'cyan');
    displayFeature('Sentry (Errors)', features.sentry);
    displayFeature('PostHog (Analytics)', features.posthog);
    log('', 'reset');

    // Payments & Security
    log('💳 Payments & Security:', 'cyan');
    displayFeature('Stripe Payments', features.stripe);
    displayFeature('CORS Configuration', features.cors);
    displayFeature('Cron Security', features.cronSecret);
    log('', 'reset');

    // Production-specific validation
    if (isProduction) {
      const criticalMissing: string[] = [];

      if (!features.nextAuth) criticalMissing.push('NEXTAUTH_SECRET');
      if (!features.sessionSecret) criticalMissing.push('SESSION_SECRET');
      if (!features.encryption) criticalMissing.push('ENCRYPTION_KEY');
      if (!features.encryptionMaster) criticalMissing.push('ENCRYPTION_MASTER_KEY');

      if (criticalMissing.length > 0) {
        log('', 'reset');
        log('❌ CRITICAL: Missing required production variables:', 'red');
        criticalMissing.forEach(key => {
          log(`   • ${key}`, 'red');
        });
        log('', 'reset');
        process.exit(1);
      }

      const warnings: string[] = [];

      if (!features.database) warnings.push('DATABASE_URL - Database features will not work');
      if (!features.supabase) warnings.push('SUPABASE_SERVICE_ROLE_KEY - Server-side auth will not work');
      if (!features.gemini && !features.claude && !features.openai) {
        warnings.push('AI Provider - No AI services configured (CDSS will not work)');
      }
      if (!features.email) warnings.push('Email Service - Email notifications will not work');
      if (!features.redis) warnings.push('Redis - Rate limiting will not scale across instances');
      if (!features.sentry) warnings.push('Sentry - Error tracking disabled');

      if (warnings.length > 0) {
        log('⚠️  Production Warnings:', 'yellow');
        warnings.forEach(warning => {
          log(`   • ${warning}`, 'yellow');
        });
        log('', 'reset');
      }
    }

    // Summary
    const totalFeatures = Object.keys(features).length;
    const enabledFeatures = Object.values(features).filter(Boolean).length;
    const percentage = Math.round((enabledFeatures / totalFeatures) * 100);

    log(`📈 Feature Coverage: ${enabledFeatures}/${totalFeatures} (${percentage}%)`, 'cyan');
    log('', 'reset');

    // Exit with success
    log('✅ Validation complete', 'green');
    log('', 'reset');
    process.exit(0);

  } catch (error) {
    log('', 'reset');
    log('❌ Validation failed', 'red');

    if (error instanceof Error) {
      log(error.message, 'red');
    }

    log('', 'reset');
    log('💡 Tip: Check your .env file and compare with .env.example', 'yellow');
    log('', 'reset');

    process.exit(1);
  }
}

function displayFeature(name: string, enabled: boolean) {
  const status = enabled ? '✅' : '⚪';
  const color = enabled ? 'green' : 'dim';
  log(`   ${status} ${name}`, color);
}

// Run validation
main();
