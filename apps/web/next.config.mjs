import path from "node:path"

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: ["@kaz/shared", "@kaz/ui"],
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
}

export default nextConfig
