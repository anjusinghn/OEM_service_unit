import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { z } from "zod"

import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"
import {
  dashboardChannel,
  depotMatchQueue,
  faultEventsQueue,
  healthRecomputeQueue,
  notificationsQueue,
  priorityRerankQueue,
  subscribe as subscribeToChannel,
  techMatchQueue,
  telemetryIngestQueue
} from "@kaz/db"

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
        depotMatchQueue,
        techMatchQueue,
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
    res.json({ status: "ok", name: "kazindustries-api", phase: "phase-1-demo" })
  })

  app.get("/api/v1/dashboard", async (_req, res) => {
    res.json(await store.getDashboardPayload())
  })

  app.get("/api/v1/vehicles", async (_req, res) => {
    res.json(await store.getVehicles())
  })

  app.get("/api/v1/vehicles/:vehicleId", async (req, res) => {
    const vehicle = await store.getVehicle(req.params.vehicleId)
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" })
      return
    }
    res.json(vehicle)
  })

  app.get("/api/v1/orchestration/priority-queue", async (_req, res) => {
    res.json(await store.getPriorityQueue())
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/priority", async (req, res) => {
    const priority = await store.getPriority(req.params.vehicleId)
    if (!priority) {
      res.status(404).json({ error: "Priority entry not found" })
      return
    }
    res.json(priority)
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/depot-match", async (req, res) => {
    res.json(await store.getDepotRecommendations(req.params.vehicleId))
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/tech-match", async (req, res) => {
    res.json(await store.getTechRecommendations(req.params.vehicleId))
  })

  app.get("/api/v1/depots", async (_req, res) => {
    res.json((await store.getDashboardPayload()).depots)
  })

  app.get("/api/v1/service-requests", async (_req, res) => {
    res.json(await store.getServiceRequests())
  })

  app.post("/api/v1/orchestration/vehicles/:vehicleId/dispatch", async (req, res) => {
    const result = await store.dispatchVehicle(req.params.vehicleId)
    if (!result) {
      res.status(404).json({ error: "Unable to dispatch vehicle" })
      return
    }
    res.json(result)
  })

  app.patch("/api/v1/service-requests/:requestId/status", async (req, res) => {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }
    const result = await store.advanceRequest(req.params.requestId, parsed.data.status)
    if (!result) {
      res.status(404).json({ error: "Unable to advance service request" })
      return
    }
    res.json(result)
  })

  app.post("/api/v1/service-requests/:requestId/complete", async (req, res) => {
    const result = await store.completeRequest(req.params.requestId)
    if (!result) {
      res.status(404).json({ error: "Unable to complete service request" })
      return
    }
    res.json(result)
  })

  app.post("/api/v1/demo/reset", async (_req, res) => {
    res.json(await store.reset())
  })

  app.get("/api/v1/forensics/cohorts", async (_req, res) => {
    res.json(await store.getCohorts())
  })

  app.get("/api/v1/forensics/cohorts/:cohortId", async (req, res) => {
    const cohort = await store.getCohort(req.params.cohortId)
    if (!cohort) {
      res.status(404).json({ error: "Cohort not found" })
      return
    }
    res.json(cohort)
  })

  app.get("/api/v1/forensics/cohorts/:cohortId/compare", async (req, res) => {
    const comparison = await store.getCohortComparison(req.params.cohortId)
    if (!comparison) {
      res.status(404).json({ error: "Cohort not found" })
      return
    }
    res.json(comparison)
  })

  app.get("/api/v1/forensics/anomalies", async (_req, res) => {
    res.json(await store.getAnomalies())
  })

  app.get("/api/v1/forensics/patterns", async (_req, res) => {
    res.json(await store.getPatterns())
  })

  app.get("/api/v1/forensics/patterns/:patternId", async (req, res) => {
    const pattern = await store.getPattern(req.params.patternId)
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" })
      return
    }
    res.json(pattern)
  })

  app.patch("/api/v1/forensics/patterns/:patternId/status", async (req, res) => {
    const { status } = req.body
    if (!status) {
      res.status(400).json({ error: "status is required" })
      return
    }
    const pattern = await store.updatePatternStatus(req.params.patternId, status)
    if (!pattern) {
      res.status(404).json({ error: "Pattern not found" })
      return
    }
    res.json(pattern)
  })

  app.get("/api/v1/forensics/investigations", async (_req, res) => {
    res.json(await store.getInvestigations())
  })

  app.get("/api/v1/forensics/investigations/:investigationId", async (req, res) => {
    const investigation = await store.getInvestigation(req.params.investigationId)
    if (!investigation) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(investigation)
  })

  app.post("/api/v1/forensics/investigations", async (req, res) => {
    const { anomalyId, patternId } = req.body ?? {}
    const result = await store.openInvestigation(anomalyId, patternId)
    res.status(201).json(result)
  })

  app.patch("/api/v1/forensics/investigations/:investigationId/status", async (req, res) => {
    const result = await store.advanceInvestigationStatus(req.params.investigationId, req.body?.status)
    if (!result) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(result)
  })

  app.get("/api/v1/forensics/investigations/:investigationId/evidence", async (req, res) => {
    const evidence = await store.getEvidencePackage(req.params.investigationId)
    if (!evidence) {
      res.status(404).json({ error: "Investigation not found" })
      return
    }
    res.json(evidence)
  })

  app.get("/api/v1/forensics/suppliers/scorecards", async (_req, res) => {
    res.json(await store.getSupplierScorecards())
  })

  app.get("/api/v1/forensics/heatmap", async (_req, res) => {
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
