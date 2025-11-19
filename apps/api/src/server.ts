import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { z } from "zod"

import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"
import {
  aiReasoningQueue,
  dashboardChannel,
  depotMatchQueue,
  faultEventsQueue,
  healthRecomputeQueue,
  notificationsQueue,
  priorityRerankQueue,
  subscribe as subscribeToChannel,
  telemetryIngestQueue
} from "@kaz/db"

import { handleLogin, handleMe, requireAuth, requireRole } from "./auth.js"
import { repositoryStore } from "./repository-store.js"
import { demoStore } from "./store.js"

const statusSchema = z.object({
  status: z
    .enum([
      "DETECTED",
      "PRIORITIZED",
      "DEPOT_ASSIGNED",
      "PARTS_CONFIRMED",
      "TECHNICIAN_ASSIGNED",
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CLOSED"
    ])
    .optional()
})

const completionSchema = z.object({
  actualFault: z.string().trim().min(1).optional().nullable(),
  diagnosisCorrect: z.boolean().optional().nullable(),
  partsUsed: z.array(z.string()).optional(),
  repairDuration: z.number().nonnegative().optional().nullable(),
  technicianNotes: z.string().trim().min(1).optional().nullable(),
  firstTimeFix: z.boolean().optional().nullable(),
  depotRating: z.number().min(1).max(5).optional().nullable(),
  technicianRating: z.number().min(1).max(5).optional().nullable(),
  priorityRating: z.number().min(1).max(5).optional().nullable()
})

function param(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? ""
}

export const createServer = (): express.Express => {
  const app = express()
  const useDemoStore = process.env.USE_DEMO_STORE === "true"
  const store = useDemoStore ? demoStore : repositoryStore
  const sseClients = new Set<express.Response>()
  app.use(cors())
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(express.json())
  app.use(
    pinoHttp({
      transport: {
        target: "pino-pretty",
        options: { colorize: true }
      }
    })
  )

  if (!useDemoStore) {
    const bullBoardAdapter = new ExpressAdapter()
    bullBoardAdapter.setBasePath("/admin/queues")

    createBullBoard({
      queues: [
        telemetryIngestQueue,
        faultEventsQueue,
        healthRecomputeQueue,
        priorityRerankQueue,
        aiReasoningQueue,
        depotMatchQueue,
        notificationsQueue
      ].map((queue) => new BullMQAdapter(queue)),
      serverAdapter: bullBoardAdapter
    })

    app.use("/admin/queues", bullBoardAdapter.getRouter())

    void subscribeToChannel(dashboardChannel, async () => {
      const payload = JSON.stringify(await store.getDashboardPayload())
      for (const client of sseClients) {
        client.write(`data: ${payload}\n\n`)
      }
    })
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", name: "kazindustries-api", phase: "phase-6" })
  })

  app.post("/api/v1/auth/login", async (req, res) => {
    await handleLogin(req, res)
  })

  app.get("/api/v1/auth/me", requireAuth, async (req, res) => {
    await handleMe(req, res)
  })

  app.get("/api/v1/dashboard", requireAuth, async (_req, res) => {
    res.json(await store.getDashboardPayload())
  })

  app.get("/api/v1/vehicles", requireAuth, async (_req, res) => {
    res.json(await store.getVehicles())
