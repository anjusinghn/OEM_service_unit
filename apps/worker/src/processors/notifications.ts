import type { Job } from "bullmq"

import { dashboardChannel, publish, queueNames, type QueuePayloadMap } from "@kaz/db"

export const processNotification = async (job: Job<QueuePayloadMap[typeof queueNames.notifications]>) => {
  await publish(dashboardChannel, JSON.stringify(job.data))
  return { published: true, type: job.data.type }
}
