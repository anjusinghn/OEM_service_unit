CREATE TABLE "ai_decision_logs" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "heuristic_output" JSONB NOT NULL,
    "ai_output" JSONB,
    "final_decision" JSONB,
    "model_name" TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_decision_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_decision_logs_vehicle_id_decision_type_created_at_idx" ON "ai_decision_logs"("vehicle_id", "decision_type", "created_at" DESC);

ALTER TABLE "ai_decision_logs" ADD CONSTRAINT "ai_decision_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
