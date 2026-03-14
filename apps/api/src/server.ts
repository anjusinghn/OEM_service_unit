import cors from "cors"
import express from "express"
import helmet from "helmet"
import pinoHttp from "pino-http"
import { z } from "zod"

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

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", name: "kazindustries-api", phase: "phase-1-demo" })
  })

  app.get("/api/v1/dashboard", (_req, res) => {
    res.json(demoStore.getDashboardPayload())
  })

  app.get("/api/v1/vehicles", (_req, res) => {
    res.json(demoStore.getVehicles())
  })

  app.get("/api/v1/vehicles/:vehicleId", (req, res) => {
    const vehicle = demoStore.getVehicle(req.params.vehicleId)
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" })
      return
    }
    res.json(vehicle)
  })

  app.get("/api/v1/orchestration/priority-queue", (_req, res) => {
    res.json(demoStore.getPriorityQueue())
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/priority", (req, res) => {
    const priority = demoStore.getPriority(req.params.vehicleId)
    if (!priority) {
      res.status(404).json({ error: "Priority entry not found" })
      return
    }
    res.json(priority)
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/depot-match", (req, res) => {
    res.json(demoStore.getDepotRecommendations(req.params.vehicleId))
  })

  app.get("/api/v1/orchestration/vehicles/:vehicleId/tech-match", (req, res) => {
    res.json(demoStore.getTechRecommendations(req.params.vehicleId))
  })

  app.get("/api/v1/depots", (_req, res) => {
    res.json(demoStore.getDashboardPayload().depots)
  })

  app.get("/api/v1/service-requests", (_req, res) => {
    res.json(demoStore.getServiceRequests())
  })

  app.post("/api/v1/orchestration/vehicles/:vehicleId/dispatch", (req, res) => {
    const result = demoStore.dispatchVehicle(req.params.vehicleId)
    if (!result) {
      res.status(404).json({ error: "Unable to dispatch vehicle" })
      return
    }
    res.json(result)
  })

  app.patch("/api/v1/service-requests/:requestId/status", (req, res) => {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }
    const result = demoStore.advanceRequest(req.params.requestId, parsed.data.status)
    if (!result) {
      res.status(404).json({ error: "Unable to advance service request" })
      return
    }
    res.json(result)
  })

  app.post("/api/v1/service-requests/:requestId/complete", (req, res) => {
    const result = demoStore.completeRequest(req.params.requestId)
    if (!result) {
      res.status(404).json({ error: "Unable to complete service request" })
      return
    }
    res.json(result)
  })

  app.post("/api/v1/demo/reset", (_req, res) => {
    res.json(demoStore.reset())
  })

  app.get("/api/v1/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const writePayload = () => {
      res.write(`data: ${JSON.stringify(demoStore.getDashboardPayload())}\n\n`)
    }

    writePayload()
    const unsubscribe = demoStore.subscribe(writePayload)

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
