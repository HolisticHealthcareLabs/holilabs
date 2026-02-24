-- Enterprise Phase 5 Persistence Tables
-- Backs the in-memory singleton stores for data durability across restarts.

-- Enterprise assessment log (data flywheel)
CREATE TABLE "enterprise_assessment_logs" (
    "id" TEXT NOT NULL,
    "anonymizedPatientId" TEXT NOT NULL,
    "assessmentPayload" JSONB NOT NULL,
    "trafficLightColor" TEXT NOT NULL,
    "signalCount" INTEGER NOT NULL,
    "compositeRiskScore" DOUBLE PRECISION NOT NULL,
    "riskTier" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_assessment_logs_pkey" PRIMARY KEY ("id")
);

-- Patient outcome records
CREATE TABLE "enterprise_outcomes" (
    "id" TEXT NOT NULL,
    "anonymizedPatientId" TEXT NOT NULL,
    "outcomeType" TEXT NOT NULL,
    "linkedOverrideIds" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_outcomes_pkey" PRIMARY KEY ("id")
);

-- API usage metering
CREATE TABLE "enterprise_usage_logs" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "patientCount" INTEGER NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_usage_logs_pkey" PRIMARY KEY ("id")
);

-- Webhook subscriptions
CREATE TABLE "enterprise_webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Webhook delivery logs
CREATE TABLE "enterprise_webhook_delivery_logs" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "error" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_webhook_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign key
ALTER TABLE "enterprise_webhook_delivery_logs" ADD CONSTRAINT "enterprise_webhook_delivery_logs_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "enterprise_webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "enterprise_assessment_logs_anonymizedPatientId_idx" ON "enterprise_assessment_logs"("anonymizedPatientId");
CREATE INDEX "enterprise_assessment_logs_organizationId_createdAt_idx" ON "enterprise_assessment_logs"("organizationId", "createdAt");
CREATE INDEX "enterprise_assessment_logs_riskTier_idx" ON "enterprise_assessment_logs"("riskTier");

CREATE INDEX "enterprise_outcomes_anonymizedPatientId_idx" ON "enterprise_outcomes"("anonymizedPatientId");
CREATE INDEX "enterprise_outcomes_outcomeType_idx" ON "enterprise_outcomes"("outcomeType");

CREATE INDEX "enterprise_usage_logs_apiKeyHash_timestamp_idx" ON "enterprise_usage_logs"("apiKeyHash", "timestamp");
CREATE INDEX "enterprise_usage_logs_endpoint_idx" ON "enterprise_usage_logs"("endpoint");

CREATE INDEX "enterprise_webhook_subscriptions_apiKeyHash_idx" ON "enterprise_webhook_subscriptions"("apiKeyHash");

CREATE INDEX "enterprise_webhook_delivery_logs_subscriptionId_idx" ON "enterprise_webhook_delivery_logs"("subscriptionId");
