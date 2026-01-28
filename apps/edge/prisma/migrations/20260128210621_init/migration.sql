-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastSyncTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRuleVersion" TEXT NOT NULL DEFAULT 'v0.0.0',
    "connectionStatus" TEXT NOT NULL DEFAULT 'offline',
    "cloudUrl" TEXT,
    "clinicId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending'
);

-- CreateTable
CREATE TABLE "RuleCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ruleLogic" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "RuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksum" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "changelog" TEXT,
    "appliedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PatientCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientHash" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "medications" TEXT NOT NULL,
    "allergies" TEXT NOT NULL,
    "diagnoses" TEXT NOT NULL,
    "planInfo" TEXT,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LocalAssuranceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientHash" TEXT NOT NULL,
    "encounterId" TEXT,
    "eventType" TEXT NOT NULL,
    "inputContextSnapshot" TEXT NOT NULL,
    "aiRecommendation" TEXT NOT NULL,
    "aiConfidence" REAL,
    "aiProvider" TEXT,
    "aiLatencyMs" INTEGER,
    "humanDecision" TEXT,
    "humanOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "ruleVersionId" TEXT,
    "clinicId" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LocalHumanFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assuranceEventId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "feedbackValue" TEXT NOT NULL,
    "feedbackSource" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrafficLightLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resultColor" TEXT NOT NULL,
    "signalCount" INTEGER NOT NULL,
    "signals" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "evaluationMs" INTEGER NOT NULL,
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideBy" TEXT,
    "overrideReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "QueueItem_status_priority_idx" ON "QueueItem"("status", "priority");

-- CreateIndex
CREATE INDEX "QueueItem_scheduledAt_idx" ON "QueueItem"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "RuleCache_ruleId_key" ON "RuleCache"("ruleId");

-- CreateIndex
CREATE INDEX "RuleCache_category_isActive_idx" ON "RuleCache"("category", "isActive");

-- CreateIndex
CREATE INDEX "RuleCache_ruleType_idx" ON "RuleCache"("ruleType");

-- CreateIndex
CREATE UNIQUE INDEX "RuleVersion_version_key" ON "RuleVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "PatientCache_patientHash_key" ON "PatientCache"("patientHash");

-- CreateIndex
CREATE INDEX "PatientCache_clinicId_idx" ON "PatientCache"("clinicId");

-- CreateIndex
CREATE INDEX "PatientCache_expiresAt_idx" ON "PatientCache"("expiresAt");

-- CreateIndex
CREATE INDEX "LocalAssuranceEvent_syncStatus_idx" ON "LocalAssuranceEvent"("syncStatus");

-- CreateIndex
CREATE INDEX "LocalAssuranceEvent_clinicId_createdAt_idx" ON "LocalAssuranceEvent"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalHumanFeedback_syncStatus_idx" ON "LocalHumanFeedback"("syncStatus");

-- CreateIndex
CREATE INDEX "LocalHumanFeedback_assuranceEventId_idx" ON "LocalHumanFeedback"("assuranceEventId");

-- CreateIndex
CREATE INDEX "TrafficLightLog_patientHash_createdAt_idx" ON "TrafficLightLog"("patientHash", "createdAt");

-- CreateIndex
CREATE INDEX "TrafficLightLog_resultColor_idx" ON "TrafficLightLog"("resultColor");
