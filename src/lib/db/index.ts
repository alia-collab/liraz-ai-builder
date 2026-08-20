import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/auth/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Dummy URL so `next build` can import this module without a live database.
// Runtime still needs a real hosted DATABASE_URL to serve data.
const BUILD_PLACEHOLDER_URL =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: getDatabaseUrl() || process.env.DATABASE_URL || BUILD_PLACEHOLDER_URL },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
