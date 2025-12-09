import type { Prisma } from "@prisma/client"

import { prisma } from "../schema"

export type RewardSignalRecord = {
  id: string
  aiDecisionLogId: string
  rewardType: string
  rewardScore: number
  rewardBreakdown: Prisma.JsonValue
  createdAt: Date
}

export type CreateRewardSignalInput = {
  aiDecisionLogId: string
  rewardType: string
  rewardScore: number
  rewardBreakdown: Prisma.InputJsonValue
}

export const rewardSignalRepository = {
  async create(data: CreateRewardSignalInput): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO reward_signals (id, ai_decision_log_id, reward_type, reward_score, reward_breakdown)
      VALUES (gen_random_uuid()::text, ${data.aiDecisionLogId}, ${data.rewardType}, ${data.rewardScore}, ${JSON.stringify(data.rewardBreakdown)}::jsonb)
    `
  },

  findByDecisionLog(aiDecisionLogId: string): Promise<RewardSignalRecord[]> {
    return prisma.$queryRaw<RewardSignalRecord[]>`
      SELECT
        id,
        ai_decision_log_id AS "aiDecisionLogId",
        reward_type AS "rewardType",
        reward_score AS "rewardScore",
        reward_breakdown AS "rewardBreakdown",
        created_at AS "createdAt"
      FROM reward_signals
      WHERE ai_decision_log_id = ${aiDecisionLogId}
      ORDER BY created_at DESC
    `
  },

  findRecent(limit = 50): Promise<RewardSignalRecord[]> {
    return prisma.$queryRaw<RewardSignalRecord[]>`
      SELECT
        id,
        ai_decision_log_id AS "aiDecisionLogId",
        reward_type AS "rewardType",
        reward_score AS "rewardScore",
        reward_breakdown AS "rewardBreakdown",
        created_at AS "createdAt"
      FROM reward_signals
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
  }
}
