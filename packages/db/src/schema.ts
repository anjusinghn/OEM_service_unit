// ─────────────────────────────────────────────────────────────
// @kaz/db — Prisma Client singleton
// Replaces the previous Drizzle ORM schema definitions.
// All table definitions now live in prisma/schema.prisma.
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma Client instances in dev (hot-reload safe)
const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

// Re-export everything consumers might need from the generated client
export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";
