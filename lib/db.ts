import type { PrismaClient } from "@prisma/client";

import { createPrismaClient } from "./create-prisma-client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db = globalForPrisma.prisma ?? createPrismaClient(env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
