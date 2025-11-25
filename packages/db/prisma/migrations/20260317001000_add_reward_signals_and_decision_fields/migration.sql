ALTER TABLE "ai_decision_logs"
  ADD COLUMN "decision_subtype" TEXT,
  ADD COLUMN "human_override" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "override_reason" TEXT;

CREATE TABLE "reward_signals" (
    "id" TEXT NOT NULL,
    "ai_decision_log_id" TEXT NOT NULL,
    "reward_type" TEXT NOT NULL,
    "reward_score" DOUBLE PRECISION NOT NULL,
    "reward_breakdown" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reward_signals_ai_decision_log_id_reward_type_created_at_idx" ON "reward_signals"("ai_decision_log_id", "reward_type", "created_at" DESC);

ALTER TABLE "reward_signals" ADD CONSTRAINT "reward_signals_ai_decision_log_id_fkey" FOREIGN KEY ("ai_decision_log_id") REFERENCES "ai_decision_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
