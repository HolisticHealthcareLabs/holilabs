-- AI Interaction Evaluation (LLM-as-Judge Quality Pipeline)
-- Implements Law 6: Every AI interaction graded asynchronously
-- Uses a cheaper judge model to evaluate primary model outputs

CREATE TABLE "ai_interaction_evaluations" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,

    -- Quality scores (0-1)
    "hallucinationScore" DOUBLE PRECISION,
    "completenessScore" DOUBLE PRECISION,
    "clinicalAccuracyScore" DOUBLE PRECISION,

    -- Issues found (JSON array of FlaggedIssue)
    "flaggedIssues" JSONB,
    "reasoning" TEXT,

    -- Evaluation metadata
    "judgeModel" TEXT,
    "judgeLatencyMs" INTEGER,

    -- Failure tracking
    "evaluationFailed" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,

    -- Cost tracking
    "primaryModelCost" DOUBLE PRECISION,
    "judgeModelCost" DOUBLE PRECISION,

    -- Timestamps
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interaction_evaluations_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE UNIQUE INDEX "ai_interaction_evaluations_interactionId_key" ON "ai_interaction_evaluations"("interactionId");
CREATE INDEX "ai_interaction_evaluations_taskType_evaluatedAt_idx" ON "ai_interaction_evaluations"("taskType", "evaluatedAt");
CREATE INDEX "ai_interaction_evaluations_hallucinationScore_idx" ON "ai_interaction_evaluations"("hallucinationScore");
CREATE INDEX "ai_interaction_evaluations_evaluationFailed_idx" ON "ai_interaction_evaluations"("evaluationFailed");
