-- Migration: Add AI Usage Tracking and Subscription Tiers
-- Run this SQL on your DigitalOcean PostgreSQL database

-- ============================================================================
-- CREATE ENUMS
-- ============================================================================

-- Subscription tier enum
CREATE TYPE "SubscriptionTierEnum" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- Subscription status enum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIALING', 'PAUSED');

-- Billing cycle enum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUALLY');

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- AI Usage Logs Table
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,

    -- Provider Info
    "provider" TEXT NOT NULL,
    "model" TEXT,

    -- User/Clinic Association
    "userId" TEXT,
    "clinicId" TEXT,
    "patientId" TEXT,

    -- Token Usage
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,

    -- Cost Metrics (in USD)
    "estimatedCost" DOUBLE PRECISION NOT NULL,

    -- Performance Metrics
    "responseTimeMs" INTEGER NOT NULL,
    "fromCache" BOOLEAN NOT NULL DEFAULT false,

    -- Context
    "queryComplexity" TEXT,
    "feature" TEXT,
    "promptPreview" TEXT,

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_usage_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Subscription Tiers Table
CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,

    -- User Association
    "userId" TEXT NOT NULL UNIQUE,

    -- Tier Info
    "tier" "SubscriptionTierEnum" NOT NULL DEFAULT 'FREE',

    -- Stripe Integration
    "stripeCustomerId" TEXT UNIQUE,
    "stripeSubscriptionId" TEXT UNIQUE,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),

    -- Usage Quotas
    "dailyAILimit" INTEGER NOT NULL DEFAULT 10,
    "monthlyAILimit" INTEGER NOT NULL DEFAULT 300,

    -- Current Usage Tracking
    "dailyAIUsed" INTEGER NOT NULL DEFAULT 0,
    "monthlyAIUsed" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Subscription Status
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,

    -- Billing
    "billingCycle" "BillingCycle",
    "amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    -- Foreign Keys
    CONSTRAINT "subscription_tiers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- AI Usage Logs indexes
CREATE INDEX "ai_usage_logs_userId_idx" ON "ai_usage_logs"("userId");
CREATE INDEX "ai_usage_logs_patientId_idx" ON "ai_usage_logs"("patientId");
CREATE INDEX "ai_usage_logs_provider_idx" ON "ai_usage_logs"("provider");
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");
CREATE INDEX "ai_usage_logs_clinicId_idx" ON "ai_usage_logs"("clinicId");

-- Subscription Tiers indexes
CREATE INDEX "subscription_tiers_userId_idx" ON "subscription_tiers"("userId");
CREATE INDEX "subscription_tiers_tier_idx" ON "subscription_tiers"("tier");
CREATE INDEX "subscription_tiers_status_idx" ON "subscription_tiers"("status");
CREATE INDEX "subscription_tiers_stripeCustomerId_idx" ON "subscription_tiers"("stripeCustomerId");
CREATE INDEX "subscription_tiers_stripeSubscriptionId_idx" ON "subscription_tiers"("stripeSubscriptionId");

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- After running migration, verify with these queries:

-- 1. Check tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('ai_usage_logs', 'subscription_tiers');

-- 2. Check enums created
-- SELECT typname FROM pg_type WHERE typtype = 'e' AND typname IN ('SubscriptionTierEnum', 'SubscriptionStatus', 'BillingCycle');

-- 3. Count records (should be 0)
-- SELECT COUNT(*) FROM ai_usage_logs;
-- SELECT COUNT(*) FROM subscription_tiers;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS "subscription_tiers" CASCADE;
-- DROP TABLE IF EXISTS "ai_usage_logs" CASCADE;
-- DROP TYPE IF EXISTS "BillingCycle";
-- DROP TYPE IF EXISTS "SubscriptionStatus";
-- DROP TYPE IF EXISTS "SubscriptionTierEnum";
