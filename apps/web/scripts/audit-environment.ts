#!/usr/bin/env tsx
/**
 * Environment Variables Audit Script
 *
 * Checks which environment variables are:
 * - ✅ Configured with real values
 * - ⚠️  Configured with placeholder values
 * - ❌ Missing
 *
 * Usage: tsx scripts/audit-environment.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface EnvVar {
  name: string;
  category: string;
  required: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  placeholder?: string;
}

// Comprehensive list of all required environment variables
const REQUIRED_ENV_VARS: EnvVar[] = [
  // Database
  {
    name: 'DATABASE_URL',
    category: 'Database',
    required: true,
    priority: 'CRITICAL',
    description: 'PostgreSQL connection string',
    placeholder: 'postgresql://',
  },

  // Authentication & Session
  {
    name: 'NEXTAUTH_SECRET',
    category: 'Authentication',
    required: true,
    priority: 'CRITICAL',
    description: 'NextAuth session encryption secret',
    placeholder: 'your-',
  },
  {
    name: 'NEXTAUTH_URL',
    category: 'Authentication',
    required: true,
    priority: 'CRITICAL',
    description: 'Production URL for NextAuth',
  },
  {
    name: 'SESSION_SECRET',
    category: 'Authentication',
    required: true,
    priority: 'CRITICAL',
    description: 'Session encryption secret',
    placeholder: 'your-',
  },

  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    category: 'Supabase',
    required: true,
    priority: 'CRITICAL',
    description: 'Supabase project URL',
    placeholder: 'your-project.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    category: 'Supabase',
    required: true,
    priority: 'CRITICAL',
    description: 'Supabase anonymous key',
    placeholder: 'your-anon-key',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    category: 'Supabase',
    required: true,
    priority: 'CRITICAL',
    description: 'Supabase service role key (admin access)',
    placeholder: 'your-service-role',
  },

  // Encryption & Security
  {
    name: 'ENCRYPTION_KEY',
    category: 'Security',
    required: true,
    priority: 'CRITICAL',
    description: 'PHI data encryption key (AES-256)',
    placeholder: 'your-',
  },
  {
    name: 'CRON_SECRET',
    category: 'Security',
    required: true,
    priority: 'HIGH',
    description: 'Cron job authentication secret',
    placeholder: 'your-',
  },
  {
    name: 'DEID_SECRET',
    category: 'Security',
    required: true,
    priority: 'HIGH',
    description: 'De-identification hashing secret',
    placeholder: 'your-',
  },

  // AI Services
  {
    name: 'ANTHROPIC_API_KEY',
    category: 'AI Services',
    required: true,
    priority: 'HIGH',
    description: 'Anthropic Claude API key',
    placeholder: 'your-anthropic',
  },
  {
    name: 'GOOGLE_AI_API_KEY',
    category: 'AI Services',
    required: false,
    priority: 'MEDIUM',
    description: 'Google Gemini API key',
    placeholder: 'your-gemini',
  },
  {
    name: 'OPENAI_API_KEY',
    category: 'AI Services',
    required: false,
    priority: 'LOW',
    description: 'OpenAI GPT-4 API key (fallback)',
    placeholder: 'your-openai',
  },
  {
    name: 'DEEPGRAM_API_KEY',
    category: 'AI Services',
    required: false,
    priority: 'MEDIUM',
    description: 'Deepgram transcription API key',
    placeholder: 'your-deepgram',
  },
  {
    name: 'ASSEMBLYAI_API_KEY',
    category: 'AI Services',
    required: false,
    priority: 'LOW',
    description: 'AssemblyAI transcription API key',
    placeholder: 'your-assemblyai',
  },

  // Communication
  {
    name: 'RESEND_API_KEY',
    category: 'Communication',
    required: true,
    priority: 'HIGH',
    description: 'Resend email service API key',
    placeholder: 're_',
  },
  {
    name: 'TWILIO_ACCOUNT_SID',
    category: 'Communication',
    required: false,
    priority: 'MEDIUM',
    description: 'Twilio account SID',
    placeholder: 'your-twilio',
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    category: 'Communication',
    required: false,
    priority: 'MEDIUM',
    description: 'Twilio authentication token',
    placeholder: 'your-twilio',
  },
  {
    name: 'TWILIO_WHATSAPP_NUMBER',
    category: 'Communication',
    required: false,
    priority: 'LOW',
    description: 'Twilio WhatsApp business number',
  },

  // Push Notifications
  {
    name: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    category: 'Push Notifications',
    required: true,
    priority: 'HIGH',
    description: 'VAPID public key for web push',
    placeholder: 'your-vapid',
  },
  {
    name: 'VAPID_PRIVATE_KEY',
    category: 'Push Notifications',
    required: true,
    priority: 'HIGH',
    description: 'VAPID private key for web push',
    placeholder: 'your-vapid',
  },
  {
    name: 'VAPID_SUBJECT',
    category: 'Push Notifications',
    required: true,
    priority: 'HIGH',
    description: 'VAPID subject (mailto:)',
  },

  // Payments
  {
    name: 'STRIPE_SECRET_KEY',
    category: 'Payments',
    required: false,
    priority: 'MEDIUM',
    description: 'Stripe secret API key',
    placeholder: 'sk_test',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    category: 'Payments',
    required: false,
    priority: 'MEDIUM',
    description: 'Stripe publishable key',
    placeholder: 'pk_test',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    category: 'Payments',
    required: false,
    priority: 'MEDIUM',
    description: 'Stripe webhook signing secret',
    placeholder: 'whsec_',
  },

  // Monitoring & Analytics
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    category: 'Monitoring',
    required: true,
    priority: 'HIGH',
    description: 'Sentry error tracking DSN',
    placeholder: 'https://your-sentry',
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    category: 'Monitoring',
    required: false,
    priority: 'MEDIUM',
    description: 'Sentry authentication token',
    placeholder: 'your-sentry',
  },
  {
    name: 'NEXT_PUBLIC_POSTHOG_KEY',
    category: 'Analytics',
    required: true,
    priority: 'HIGH',
    description: 'PostHog analytics project key',
    placeholder: 'phc_',
  },
  {
    name: 'NEXT_PUBLIC_POSTHOG_HOST',
    category: 'Analytics',
    required: true,
    priority: 'HIGH',
    description: 'PostHog host URL (US for HIPAA)',
  },

  // Rate Limiting
  {
    name: 'UPSTASH_REDIS_REST_URL',
    category: 'Rate Limiting',
    required: false,
    priority: 'MEDIUM',
    description: 'Upstash Redis REST URL',
    placeholder: 'https://your-redis.upstash.io',
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    category: 'Rate Limiting',
    required: false,
    priority: 'MEDIUM',
    description: 'Upstash Redis REST token',
    placeholder: 'your-upstash',
  },

  // Storage
  {
    name: 'R2_ENDPOINT',
    category: 'Storage',
    required: false,
    priority: 'LOW',
    description: 'Cloudflare R2 endpoint',
  },
  {
    name: 'R2_BUCKET',
    category: 'Storage',
    required: false,
    priority: 'LOW',
    description: 'Cloudflare R2 bucket name',
  },
  {
    name: 'R2_ACCESS_KEY_ID',
    category: 'Storage',
    required: false,
    priority: 'LOW',
    description: 'Cloudflare R2 access key',
  },
  {
    name: 'R2_SECRET_ACCESS_KEY',
    category: 'Storage',
    required: false,
    priority: 'LOW',
    description: 'Cloudflare R2 secret key',
  },

  // CFDI (Mexican Tax Compliance)
  {
    name: 'HOLI_LABS_RFC',
    category: 'CFDI',
    required: false,
    priority: 'LOW',
    description: 'Holi Labs RFC (tax ID)',
  },
  {
    name: 'PAC_PROVIDER',
    category: 'CFDI',
    required: false,
    priority: 'LOW',
    description: 'PAC provider (finkok, sw-sapien)',
  },
  {
    name: 'PAC_API_URL',
    category: 'CFDI',
    required: false,
    priority: 'LOW',
    description: 'PAC API endpoint',
  },

  // Application Config
  {
    name: 'NEXT_PUBLIC_APP_URL',
    category: 'Application',
    required: true,
    priority: 'CRITICAL',
    description: 'Production app URL',
  },
  {
    name: 'NODE_ENV',
    category: 'Application',
    required: true,
    priority: 'CRITICAL',
    description: 'Node environment (production)',
  },
];

interface AuditResult {
  status: 'configured' | 'placeholder' | 'missing';
  value?: string;
  maskedValue?: string;
}

function isPlaceholder(value: string | undefined, placeholders?: string): boolean {
  if (!value) return false;

  const placeholderPatterns = [
    'your-',
    'test-',
    'example',
    'localhost',
    'placeholder',
    'change-me',
    'replace-me',
    'xxx',
  ];

  if (placeholders) {
    placeholderPatterns.push(placeholders);
  }

  return placeholderPatterns.some(pattern =>
    value.toLowerCase().includes(pattern)
  );
}

function maskValue(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

function auditEnvVar(envVar: EnvVar): AuditResult {
  const value = process.env[envVar.name];

  if (!value) {
    return { status: 'missing' };
  }

  if (isPlaceholder(value, envVar.placeholder)) {
    return {
      status: 'placeholder',
      value,
      maskedValue: maskValue(value),
    };
  }

  return {
    status: 'configured',
    value,
    maskedValue: maskValue(value),
  };
}

function printHeader(text: string) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

function printSubheader(text: string) {
  console.log(`\n${colors.bold}${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.blue}${'-'.repeat(80)}${colors.reset}\n`);
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'configured':
      return `${colors.green}✅${colors.reset}`;
    case 'placeholder':
      return `${colors.yellow}⚠️ ${colors.reset}`;
    case 'missing':
      return `${colors.red}❌${colors.reset}`;
    default:
      return '  ';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return colors.red;
    case 'HIGH':
      return colors.yellow;
    case 'MEDIUM':
      return colors.blue;
    case 'LOW':
      return colors.reset;
    default:
      return colors.reset;
  }
}

function main() {
  printHeader('🔍 ENVIRONMENT VARIABLES AUDIT REPORT');

  console.log(`${colors.bold}Generated:${colors.reset} ${new Date().toISOString()}`);
  console.log(`${colors.bold}Environment:${colors.reset} ${process.env.NODE_ENV || 'development'}\n`);

  // Audit all variables
  const results = new Map<string, Map<string, { envVar: EnvVar; result: AuditResult }>>();

  // Group by category
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!results.has(envVar.category)) {
      results.set(envVar.category, new Map());
    }
    const result = auditEnvVar(envVar);
    results.get(envVar.category)!.set(envVar.name, { envVar, result });
  }

  // Print results by category
  for (const [category, vars] of results.entries()) {
    printSubheader(`📦 ${category}`);

    for (const [name, { envVar, result }] of vars.entries()) {
      const icon = getStatusIcon(result.status);
      const priorityColor = getPriorityColor(envVar.priority);
      const priority = `[${envVar.priority}]`;
      const required = envVar.required ? '(Required)' : '(Optional)';

      console.log(`${icon} ${colors.bold}${name}${colors.reset}`);
      console.log(`   ${priorityColor}${priority}${colors.reset} ${required}`);
      console.log(`   ${colors.reset}${envVar.description}${colors.reset}`);

      if (result.status === 'configured') {
        console.log(`   ${colors.green}Value: ${result.maskedValue}${colors.reset}`);
      } else if (result.status === 'placeholder') {
        console.log(`   ${colors.yellow}Has placeholder value: ${result.maskedValue}${colors.reset}`);
      } else {
        console.log(`   ${colors.red}Not configured${colors.reset}`);
      }
      console.log();
    }
  }

  // Summary statistics
  printSubheader('📊 SUMMARY');

  let configured = 0;
  let placeholder = 0;
  let missing = 0;
  let criticalMissing = 0;
  let requiredMissing = 0;

  for (const [, vars] of results.entries()) {
    for (const [, { envVar, result }] of vars.entries()) {
      if (result.status === 'configured') {
        configured++;
      } else if (result.status === 'placeholder') {
        placeholder++;
        if (envVar.priority === 'CRITICAL' || envVar.required) {
          requiredMissing++;
        }
        if (envVar.priority === 'CRITICAL') {
          criticalMissing++;
        }
      } else {
        missing++;
        if (envVar.priority === 'CRITICAL' || envVar.required) {
          requiredMissing++;
        }
        if (envVar.priority === 'CRITICAL') {
          criticalMissing++;
        }
      }
    }
  }

  const total = REQUIRED_ENV_VARS.length;
  const completionRate = Math.round((configured / total) * 100);

  console.log(`${colors.bold}Total Variables:${colors.reset} ${total}`);
  console.log(`${colors.green}${colors.bold}✅ Configured:${colors.reset} ${configured}`);
  console.log(`${colors.yellow}${colors.bold}⚠️  Placeholder:${colors.reset} ${placeholder}`);
  console.log(`${colors.red}${colors.bold}❌ Missing:${colors.reset} ${missing}`);
  console.log(`${colors.bold}Completion Rate:${colors.reset} ${completionRate}%\n`);

  // Critical issues
  if (criticalMissing > 0 || requiredMissing > 0) {
    printSubheader('🚨 CRITICAL ISSUES');

    if (criticalMissing > 0) {
      console.log(`${colors.red}${colors.bold}${criticalMissing} CRITICAL variables are missing or have placeholder values!${colors.reset}`);
      console.log(`${colors.red}The application will NOT function properly without these.${colors.reset}\n`);
    }

    if (requiredMissing > 0) {
      console.log(`${colors.yellow}${colors.bold}${requiredMissing} required variables need configuration.${colors.reset}\n`);
    }

    console.log(`${colors.bold}Action Required:${colors.reset}`);
    console.log(`1. Generate missing secrets: ${colors.cyan}npm run generate-secrets${colors.reset}`);
    console.log(`2. Add to production: Follow DEPLOYMENT_SECRETS_CHECKLIST.md\n`);
  }

  // Next steps
  printSubheader('📝 NEXT STEPS');

  console.log(`1. ${colors.bold}Review placeholder values${colors.reset} - Replace all "your-" and "test-" values`);
  console.log(`2. ${colors.bold}Generate missing secrets${colors.reset} - Use openssl or npx web-push`);
  console.log(`3. ${colors.bold}Configure API keys${colors.reset} - Get keys from respective service providers`);
  console.log(`4. ${colors.bold}Add to DigitalOcean${colors.reset} - Update App-Level Environment Variables`);
  console.log(`5. ${colors.bold}Verify deployment${colors.reset} - Test all critical endpoints after deployment\n`);

  // Export JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    summary: {
      total,
      configured,
      placeholder,
      missing,
      criticalMissing,
      requiredMissing,
      completionRate,
    },
    variables: Array.from(results.entries()).flatMap(([category, vars]) =>
      Array.from(vars.entries()).map(([name, { envVar, result }]) => ({
        name,
        category,
        priority: envVar.priority,
        required: envVar.required,
        status: result.status,
        description: envVar.description,
      }))
    ),
  };

  const reportPath = path.join(__dirname, '../environment-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));

  console.log(`${colors.green}✅ JSON report saved to:${colors.reset} ${reportPath}\n`);

  // Exit with error if critical variables are missing
  if (criticalMissing > 0) {
    process.exit(1);
  }
}

// Run audit
main();
