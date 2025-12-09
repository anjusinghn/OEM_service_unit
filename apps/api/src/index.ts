import { createServer } from "./server.js"

const port = Number(process.env.PORT ?? 4000)
const app = createServer()

app.listen(port, () => {
  console.log(`[api] kazindustries phase-one demo listening on http://localhost:${port}`)
})
