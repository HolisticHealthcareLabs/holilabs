-- Command Center Fleet + Workspace boundary (non-PHI)

-- NOTE: Prisma migration generated manually for local review.
-- Apply via: pnpm -C apps/web prisma migrate dev

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "metadata" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Postgres does NOT support `ADD CONSTRAINT IF NOT EXISTS`.
-- Make this idempotent with a DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspaces_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "workspaces"
      ADD CONSTRAINT "workspaces_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_members_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workspace_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspaceId_userId_key"
  ON "workspace_members"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "workspace_members_userId_idx" ON "workspace_members"("userId");
CREATE INDEX IF NOT EXISTS "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

CREATE TABLE IF NOT EXISTS "workspace_api_keys" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_api_keys_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "workspace_api_keys_workspaceId_idx" ON "workspace_api_keys"("workspaceId");
CREATE INDEX IF NOT EXISTS "workspace_api_keys_revokedAt_idx" ON "workspace_api_keys"("revokedAt");

CREATE TABLE IF NOT EXISTS "agent_devices" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "deviceType" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "os" TEXT,
  "hostname" TEXT,
  "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenIp" TEXT,
  "sidecarVersion" TEXT,
  "edgeVersion" TEXT,
  "rulesetVersion" TEXT,
  "permissions" JSONB,
  "health" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "agent_devices_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_devices_workspaceId_deviceId_key"
  ON "agent_devices"("workspaceId", "deviceId");
CREATE INDEX IF NOT EXISTS "agent_devices_workspaceId_lastHeartbeatAt_idx"
  ON "agent_devices"("workspaceId", "lastHeartbeatAt");
CREATE INDEX IF NOT EXISTS "agent_devices_workspaceId_deviceType_idx"
  ON "agent_devices"("workspaceId", "deviceType");

CREATE TABLE IF NOT EXISTS "agent_heartbeats" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "agentDeviceId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sidecarVersion" TEXT,
  "edgeVersion" TEXT,
  "rulesetVersion" TEXT,
  "latencyMs" INTEGER,
  "permissions" JSONB,
  "health" JSONB,
  CONSTRAINT "agent_heartbeats_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_heartbeats_agentDeviceId_fkey"
    FOREIGN KEY ("agentDeviceId") REFERENCES "agent_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_heartbeats_workspaceId_receivedAt_idx"
  ON "agent_heartbeats"("workspaceId", "receivedAt");
CREATE INDEX IF NOT EXISTS "agent_heartbeats_agentDeviceId_receivedAt_idx"
  ON "agent_heartbeats"("agentDeviceId", "receivedAt");

CREATE TABLE IF NOT EXISTS "fleet_events" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "agentDeviceId" TEXT,
  "eventType" TEXT NOT NULL,
  "ruleId" TEXT,
  "color" TEXT,
  "latencyMs" INTEGER,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "meta" JSONB,
  CONSTRAINT "fleet_events_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fleet_events_agentDeviceId_fkey"
    FOREIGN KEY ("agentDeviceId") REFERENCES "agent_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "fleet_events_workspaceId_occurredAt_idx"
  ON "fleet_events"("workspaceId", "occurredAt");
CREATE INDEX IF NOT EXISTS "fleet_events_workspaceId_eventType_occurredAt_idx"
  ON "fleet_events"("workspaceId", "eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "fleet_events_agentDeviceId_occurredAt_idx"
  ON "fleet_events"("agentDeviceId", "occurredAt");

