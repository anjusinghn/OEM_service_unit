import path from "node:path"

/** @type {import('next').NextConfig} */
const apiProxy = process.env.API_PROXY_URL ?? "http://127.0.0.1:4000"

const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@kaz/shared", "@kaz/ui"],
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    optimizePackageImports: ["lucide-react"]
  },
  async rewrites() {
    return [
      { source: "/health", destination: `${apiProxy}/health` }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" }
        ]
      }
    ]
  }
}

export default nextConfig
