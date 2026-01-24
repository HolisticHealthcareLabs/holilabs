-- Clinical Rules: JSON-Logic based business rules
-- Enables runtime rule changes without deployment

-- Create clinical_rules table
CREATE TABLE IF NOT EXISTS "clinical_rules" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "logic" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "clinicId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastEvaluated" TIMESTAMP(3),
    "evaluationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "clinical_rules_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_rules_ruleId_key" ON "clinical_rules"("ruleId");
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_rules_ruleId_clinicId_key" ON "clinical_rules"("ruleId", "clinicId");

-- Performance indexes
CREATE INDEX IF NOT EXISTS "clinical_rules_category_isActive_idx" ON "clinical_rules"("category", "isActive");
CREATE INDEX IF NOT EXISTS "clinical_rules_clinicId_idx" ON "clinical_rules"("clinicId");
CREATE INDEX IF NOT EXISTS "clinical_rules_priority_idx" ON "clinical_rules"("priority");

-- Seed initial business rules for risk scoring and routing
INSERT INTO "clinical_rules" ("id", "ruleId", "name", "category", "logic", "priority", "isActive", "description", "updatedAt")
VALUES
    -- Risk scoring rule: Flag high-risk patients
    (
        gen_random_uuid()::text,
        'RISK-SCORE-HIGH',
        'Flag high-risk patients',
        'scoring',
        '{"if": [{">": [{"var": "riskScore"}, 80]}, "FLAG_HIGH_RISK", "CONTINUE"]}'::jsonb,
        100,
        true,
        'Patients with risk score > 80 are flagged for immediate attention',
        NOW()
    ),
    -- Risk scoring rule: Medium risk patients
    (
        gen_random_uuid()::text,
        'RISK-SCORE-MEDIUM',
        'Flag medium-risk patients',
        'scoring',
        '{"if": [{"and": [{">": [{"var": "riskScore"}, 50]}, {"<=": [{"var": "riskScore"}, 80]}]}, "FLAG_MEDIUM_RISK", "CONTINUE"]}'::jsonb,
        90,
        true,
        'Patients with risk score 51-80 are flagged for follow-up',
        NOW()
    ),
    -- Routing rule: New signups go to onboarding
    (
        gen_random_uuid()::text,
        'ROUTING-NEW-SIGNUP',
        'Route new signups to onboarding',
        'routing',
        '{"if": [{"and": [{"==": [{"var": "isNewSignup"}, true]}, {"<": [{"var": "daysSinceSignup"}, 7]}]}, "ROUTE_TO_ONBOARDING", "ROUTE_TO_POOL"]}'::jsonb,
        80,
        true,
        'New patients (< 7 days) are routed to onboarding specialist',
        NOW()
    ),
    -- Alert rule: Abnormal vitals
    (
        gen_random_uuid()::text,
        'ALERT-ABNORMAL-VITALS',
        'Alert on abnormal vitals',
        'alert',
        '{"if": [{"or": [{">": [{"var": "vitals.systolicBp"}, 180]}, {"<": [{"var": "vitals.systolicBp"}, 90]}, {">": [{"var": "vitals.heartRate"}, 120]}, {"<": [{"var": "vitals.heartRate"}, 50]}]}, "ALERT_CRITICAL_VITALS", "CONTINUE"]}'::jsonb,
        200,
        true,
        'Alert when BP > 180 or < 90, or HR > 120 or < 50',
        NOW()
    ),
    -- Alert rule: High A1C
    (
        gen_random_uuid()::text,
        'ALERT-HIGH-A1C',
        'Alert on high A1C',
        'alert',
        '{"if": [{">": [{"var": "labs.a1c"}, 9.0]}, "ALERT_HIGH_A1C", "CONTINUE"]}'::jsonb,
        150,
        true,
        'Alert when A1C > 9.0% indicating poor diabetes control',
        NOW()
    ),
    -- Business rule: Follow-up scheduling
    (
        gen_random_uuid()::text,
        'FOLLOWUP-CHRONIC-CONDITION',
        'Schedule follow-up for chronic conditions',
        'business',
        '{"if": [{"in": [{"var": "primaryCondition"}, ["diabetes", "hypertension", "heart_failure"]]}, "SCHEDULE_30_DAY_FOLLOWUP", "SCHEDULE_90_DAY_FOLLOWUP"]}'::jsonb,
        60,
        true,
        'Chronic condition patients need 30-day follow-up, others 90-day',
        NOW()
    )
ON CONFLICT ("ruleId") DO NOTHING;

-- Comment for operations team
COMMENT ON TABLE "clinical_rules" IS 'JSON-Logic based business rules. Changes take effect within 1 minute (cache TTL). Use category field to group rules.';
