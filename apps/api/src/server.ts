import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { z } from "zod"

import {
  clientIp,
  createRateLimiter,
  readJsonError,
  rejectMutations,
  rejectUnsafeRequests,
  resolveGuardrails,
  type GuardrailOptions
} from "./guardrails.js"

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

import { CHENNAI_SCENARIO } from "@kaz/shared"

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
  actualFault: z.string().trim().min(1).max(200).optional().nullable(),
  diagnosisCorrect: z.boolean().optional().nullable(),
  partsUsed: z.array(z.string().trim().min(1).max(120)).max(40).optional(),
  repairDuration: z.number().nonnegative().max(10000).optional().nullable(),
  technicianNotes: z.string().trim().min(1).max(2000).optional().nullable(),
  firstTimeFix: z.boolean().optional().nullable(),
  depotRating: z.number().min(1).max(5).optional().nullable(),
  technicianRating: z.number().min(1).max(5).optional().nullable(),
  priorityRating: z.number().min(1).max(5).optional().nullable()
})

const SAFE_ID = /^[A-Za-z0-9:_-]{1,64}$/

function param(v: string | string[] | undefined): string {
  const raw = Array.isArray(v) ? v[0] ?? "" : v ?? ""
  return SAFE_ID.test(raw) ? raw : ""
}

export const createServer = (options: Partial<GuardrailOptions> = {}): express.Express => {
  const app = express()
  const guards = resolveGuardrails(options)
  const chennai = process.env.SIMULATION_SCENARIO === CHENNAI_SCENARIO
  const publicDemo = !chennai && process.env.PUBLIC_DEMO !== "false"
  const readAccess: express.RequestHandler[] = publicDemo ? [] : [requireAuth]
  const useDemoStore = process.env.USE_DEMO_STORE === "true"
  const store = useDemoStore ? demoStore : repositoryStore
  const sseClients = new Set<express.Response>()
  const sseCounts = new Map<string, number>()
  let sseTotal = 0
  let dashboardCache: { at: number; value: ReturnType<typeof store.getDashboardPayload> } | null = null

  const loadDashboard = () => {
    if (guards.allowMutations) return store.getDashboardPayload()
    const now = Date.now()
    if (dashboardCache && now - dashboardCache.at < 1500) return dashboardCache.value
    const value = store.getDashboardPayload()
    dashboardCache = { at: now, value }
    return value
  }

  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1)
  }
  app.disable("x-powered-by")
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(rejectUnsafeRequests)
  app.use(createRateLimiter(guards.rateLimitMax, guards.rateLimitWindowMs))
  app.use(cors({
    origin(origin, callback) {
      if (!origin || guards.corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    methods: guards.allowMutations
      ? ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
      : ["GET", "HEAD", "OPTIONS"],
    maxAge: 600
  }))
  app.use(express.json({ limit: "16kb" }))
  app.use(rejectMutations(guards.allowMutations))
  app.use(
    pinoHttp({
      redact: ["req.headers.authorization", "req.headers.cookie", "req.body.password"],
      transport: {
        target: "pino-pretty",
        options: { colorize: true }
      }
    })
  )

  if (!useDemoStore && guards.exposeQueueAdmin) {
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

    app.use("/admin/queues", requireAuth, requireRole("PLATFORM_ADMIN"), bullBoardAdapter.getRouter())
  }

  if (!useDemoStore) {
    void subscribeToChannel(dashboardChannel, async () => {
      if (!sseClients.size) return
      try {
        const payload = JSON.stringify(await loadDashboard())
        for (const client of sseClients) client.write(`data: ${payload}\n\n`)
      } catch (error) {
        console.error("Could not refresh live fleet data", error)
      }
    })
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", name: "fleet-command-api", phase: "phase-6" })
  })

  app.post("/api/v1/auth/login", async (req, res) => {
    await handleLogin(req, res)
  })

  app.get("/api/v1/auth/me", requireAuth, async (req, res) => {
    await handleMe(req, res)
  })

  app.get("/api/v1/dashboard", ...readAccess, async (_req, res) => {
    res.json(await loadDashboard())
  })

  app.get("/api/v1/vehicles", ...readAccess, async (_req, res) => {
    res.json(await store.getVehicles())
  })

  app.get("/api/v1/vehicles/:vehicleId", ...readAccess, async (req, res) => {
    const vehicle = await store.getVehicle(param(req.params.vehicleId))
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" })
      return
    }
    res.json(vehicle)
  })

  app.get("/api/v1/orchestration/priority-queue", ...readAccess, async (_req, res) => {
    res.json(await store.getPriorityQueue())
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/priority", ...readAccess, async (req, res) => {
    const priority = await store.getPriority(param(req.params.vehicleId))
    if (!priority) {
      res.status(404).json({ error: "Priority entry not found" })
      return
    }
    res.json(priority)
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/depot-match", ...readAccess, async (req, res) => {
    res.json(await store.getDepotRecommendations(param(req.params.vehicleId)))
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/dispatch-plan", ...readAccess, async (req, res) => {
    const plan = await repositoryStore.getDispatchPlan(param(req.params.vehicleId), publicDemo && !guards.allowMutations)
    if (!plan) {
      res.status(chennai ? 409 : 404).json({ error: chennai
        ? "No dispatch plan is available. Check the active fault and workshop availability."
        : "Unable to build dispatch plan" })
      return
    }
    res.json(plan)
  })

  app.get("/api/v1/orchestration/escalations", ...readAccess, async (_req, res) => {
    const dashboard = await loadDashboard()
    res.json(dashboard.aiEscalations ?? [])
  })

  app.get("/api/v1/intelligence", ...readAccess, async (_req, res) => {
    res.json(await store.getIntelligenceSnapshot())
  })

  app.get("/api/v1/intelligence/decisions", ...readAccess, async (req, res) => {
    const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined
    res.json(await store.getDecisionAuditTrail(vehicleId))
  })

  app.get("/api/v1/depots", ...readAccess, async (_req, res) => {
    res.json((await loadDashboard()).depots)
  })

  app.get("/api/v1/service-requests", ...readAccess, async (_req, res) => {
    res.json(await store.getServiceRequests())
  })

  app.post("/api/v1/orchestration/vehicles/:vehicleId/dispatch", requireAuth, requireRole("PLATFORM_ADMIN", "OEM_ADMIN", "DEPOT_MANAGER"), async (req, res) => {
    const overrides = req.body && typeof req.body === "object" ? req.body : {}
    const depotId = typeof overrides.depotId === "string" ? overrides.depotId : undefined
    const result = await store.dispatchVehicle(param(req.params.vehicleId), depotId)
    if (!result) {
      res.status(chennai ? 409 : 404).json({ error: chennai
        ? "The workshop is no longer available for this repair. Generate a new plan."
        : "Unable to dispatch vehicle" })
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
    if (chennai) {
      res.status(409).json({ error: "Restart the Chennai scenario from its local launcher." })
      return
    }
    res.json(await store.reset())
  })

  app.get("/api/v1/forensics/cohorts", ...readAccess, async (_req, res) => {
    res.json(await store.getCohorts())
  })

  app.get("/api/v1/forensics/cohorts/:cohortId", ...readAccess, async (req, res) => {
    const cohort = await store.getCohort(param(req.params.cohortId))
    if (!cohort) {
      res.status(404).json({ error: "Cohort not found" })
      return
    }
    res.json(cohort)
  })

  app.get("/api/v1/forensics/cohorts/:cohortId/compare", ...readAccess, async (req, res) => {
    const comparison = await store.getCohortComparison(param(req.params.cohortId))
    if (!comparison) {
      res.status(404).json({ error: "Cohort not found" })
      return
    }
    res.json(comparison)
  })

  app.get("/api/v1/forensics/anomalies", ...readAccess, async (_req, res) => {
    res.json(await store.getAnomalies())
  })

  app.get("/api/v1/forensics/patterns", ...readAccess, async (_req, res) => {
    res.json(await store.getPatterns())
  })

  app.get("/api/v1/forensics/patterns/:patternId", ...readAccess, async (req, res) => {
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

  app.get("/api/v1/forensics/investigations", ...readAccess, async (_req, res) => {
    res.json(await store.getInvestigations())
  })

  app.get("/api/v1/forensics/investigations/:investigationId", ...readAccess, async (req, res) => {
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

  app.get("/api/v1/forensics/investigations/:investigationId/evidence", ...readAccess, async (req, res) => {
    const evidence = await store.getEvidencePackage(param(req.params.investigationId))
    if (!evidence) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(evidence)
  })

  app.get("/api/v1/forensics/suppliers/scorecards", ...readAccess, async (_req, res) => {
    res.json(await store.getSupplierScorecards())
  })

  app.get("/api/v1/forensics/heatmap", ...readAccess, async (_req, res) => {
    res.json(await store.getHeatmapData())
  })

  app.get("/api/v1/events", (req, res, next) => {
    const ip = clientIp(req)
    const openForIp = sseCounts.get(ip) ?? 0
    if (openForIp >= guards.maxSsePerIp || sseTotal >= guards.maxSseClients) {
      res.status(503).json({ error: "Too many live connections" })
      return
    }

    sseCounts.set(ip, openForIp + 1)
    sseTotal += 1
    const release = () => {
      sseTotal = Math.max(0, sseTotal - 1)
      const next = (sseCounts.get(ip) ?? 1) - 1
      if (next <= 0) sseCounts.delete(ip)
      else sseCounts.set(ip, next)
    }
    const life = setTimeout(() => {
      res.end()
    }, 10 * 60 * 1000)

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no")
    res.flushHeaders?.()

    const writePayload = async () => {
      res.write(`data: ${JSON.stringify(await loadDashboard())}\n\n`)
    }

    void writePayload().catch(next)
    const unsubscribe = useDemoStore
      ? demoStore.subscribe(() => {
          void writePayload().catch(next)
        })
      : (() => {
          sseClients.add(res)
          return () => {
            sseClients.delete(res)
          }
        })()

    res.once("close", () => {
      clearTimeout(life)
      release()
      unsubscribe()
      res.end()
    })
  })

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error)
      return
    }
    const readable = readJsonError(error)
    if (readable) {
      res.status(readable.status).json({ error: readable.message })
      return
    }
    console.error(error)
    res.status(500).json({ error: "Unexpected server error" })
  })

  return app
}
