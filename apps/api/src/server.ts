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
  })

  app.get("/api/v1/vehicles/:vehicleId", requireAuth, async (req, res) => {
    const vehicle = await store.getVehicle(param(req.params.vehicleId))
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" })
      return
    }
    res.json(vehicle)
  })

  app.get("/api/v1/orchestration/priority-queue", requireAuth, async (_req, res) => {
    res.json(await store.getPriorityQueue())
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/priority", requireAuth, async (req, res) => {
    const priority = await store.getPriority(param(req.params.vehicleId))
    if (!priority) {
      res.status(404).json({ error: "Priority entry not found" })
      return
    }
    res.json(priority)
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/depot-match", requireAuth, async (req, res) => {
    res.json(await store.getDepotRecommendations(param(req.params.vehicleId)))
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/dispatch-plan", requireAuth, async (req, res) => {
    const plan = await repositoryStore.getDispatchPlan(param(req.params.vehicleId))
    if (!plan) {
      res.status(404).json({ error: "Unable to build dispatch plan" })
      return
    }
    res.json(plan)
  })

  app.get("/api/v1/orchestration/escalations", requireAuth, async (_req, res) => {
    const dashboard = await store.getDashboardPayload()
    res.json(dashboard.aiEscalations ?? [])
  })

  app.get("/api/v1/intelligence", requireAuth, async (_req, res) => {
    res.json(await store.getIntelligenceSnapshot())
  })

  app.get("/api/v1/intelligence/decisions", requireAuth, async (req, res) => {
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined
    res.json(await store.getDecisionAuditTrail(vehicleId))
  })

  app.get("/api/v1/depots", requireAuth, async (_req, res) => {
    res.json((await store.getDashboardPayload()).depots)
  })

  app.get("/api/v1/service-requests", requireAuth, async (_req, res) => {
    res.json(await store.getServiceRequests())
  })

  app.post("/api/v1/orchestration/vehicles/:vehicleId/dispatch", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN", "DEPOT_MANAGER"), async (req, res) => {
    const overrides = req.body && typeof req.body === "object" ? req.body : {}
    const depotId = typeof overrides.depotId === "string" ? overrides.depotId : undefined
    const result = await store.dispatchVehicle(param(req.params.vehicleId), depotId)
    if (!result) {
      res.status(404).json({ error: "Unable to dispatch vehicle" })
      return
    }
    res.json(result)
  })

  app.patch("/api/v1/service-requests/:requestId/status", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN", "DEPOT_MANAGER", "TECHNICIAN"), async (req, res) => {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }
    const result = await store.advanceRequest(param(req.params.requestId), parsed.data.status)
    if (!result) {
      res.status(404).json({ error: "Unable to advance service request" })
      return
    }
    res.json(result)
  })

  app.post("/api/v1/service-requests/:requestId/complete", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN", "DEPOT_MANAGER", "TECHNICIAN"), async (req, res) => {
    const parsed = completionSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    const result = useDemoStore
      ? await store.completeRequest(param(req.params.requestId))
      : await repositoryStore.completeRequest(param(req.params.requestId), parsed.data)
    if (!result) {
      res.status(404).json({ error: "Unable to complete service request" })
      return
    }
    res.json(result)
  })

  app.post("/api/v1/demo/reset", requireAuth, requireRole("PLATFORM_ADMIN"), async (_req, res) => {
    res.json(await store.reset())
  })

  app.get("/api/v1/forensics/cohorts", requireAuth, async (_req, res) => {
    res.json(await store.getCohorts())
  })

  app.get("/api/v1/forensics/cohorts/:cohortId", requireAuth, async (req, res) => {
    const cohort = await store.getCohort(param(req.params.cohortId))
    if (!cohort) {
      res.status(404).json({ error: "Cohort not found" })
      return
    }
    res.json(cohort)
  })

  app.get("/api/v1/forensics/cohorts/:cohortId/compare", requireAuth, async (req, res) => {
    const comparison = await store.getCohortComparison(param(req.params.cohortId))
    if (!comparison) {
      res.status(404).json({ error: "Cohort not found" })
      return
    }
    res.json(comparison)
  })

  app.get("/api/v1/forensics/anomalies", requireAuth, async (_req, res) => {
    res.json(await store.getAnomalies())
  })

  app.get("/api/v1/forensics/patterns", requireAuth, async (_req, res) => {
    res.json(await store.getPatterns())
  })

  app.get("/api/v1/forensics/patterns/:patternId", requireAuth, async (req, res) => {
    const pattern = await store.getPattern(param(req.params.patternId))
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" })
      return
    }
    res.json(pattern)
  })

  app.patch("/api/v1/forensics/patterns/:patternId/status", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN"), async (req, res) => {
    const { status } = req.body
    if (!status) {
      res.status(400).json({ error: "status is required" })
      return
    }
    const pattern = await store.updatePatternStatus(param(req.params.patternId), status)
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" })
      return
    }
    res.json(pattern)
  })

  app.get("/api/v1/forensics/investigations", requireAuth, async (_req, res) => {
    res.json(await store.getInvestigations())
  })

  app.get("/api/v1/forensics/investigations/:investigationId", requireAuth, async (req, res) => {
    const investigation = await store.getInvestigation(param(req.params.investigationId))
    if (!investigation) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(investigation)
  })

  app.post("/api/v1/forensics/investigations", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN"), async (req, res) => {
    const { anomalyId, patternId } = req.body ?? {}
    const result = await store.openInvestigation(anomalyId, patternId)
    res.status(201).json(result)
  })

  app.patch("/api/v1/forensics/investigations/:investigationId/status", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN"), async (req, res) => {
    const result = await store.advanceInvestigationStatus(param(req.params.investigationId), req.body?.status)
    if (!result) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(result)
  })

  app.get("/api/v1/forensics/investigations/:investigationId/evidence", requireAuth, async (req, res) => {
    const evidence = await store.getEvidencePackage(param(req.params.investigationId))
    if (!evidence) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(evidence)
  })

  app.get("/api/v1/forensics/suppliers/scorecards", requireAuth, async (_req, res) => {
    res.json(await store.getSupplierScorecards())
  })

  app.get("/api/v1/forensics/heatmap", requireAuth, async (_req, res) => {
    res.json(await store.getHeatmapData())
  })

  app.get("/api/v1/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const writePayload = async () => {
      res.write(`data: ${JSON.stringify(await store.getDashboardPayload())}\n\n`)
    }

    void writePayload()
    const unsubscribe = useDemoStore
      ? demoStore.subscribe(() => {
          void writePayload()
        })
      : (() => {
          sseClients.add(res)
          return () => {
            sseClients.delete(res)
          }
        })()

    req.on("close", () => {
      unsubscribe()
      res.end()
    })
  })

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error)
    res.status(500).json({ error: "Unexpected server error" })
  })

  return app
}
