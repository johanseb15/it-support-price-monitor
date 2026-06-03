import type { PrismaClient } from "@prisma/client";

import { createPrismaClient } from "./create-prisma-client";
import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma = createPrismaClient(getEnv().DATABASE_URL);
    } catch (error) {
      // During build time, DATABASE_URL may not be available.
      // Throw here so runtime knows to fail properly.
      throw new Error(
        `Failed to initialize database client. Ensure DATABASE_URL is set. Details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return globalForPrisma.prisma;
}

// Lazy proxy: PrismaClient is only instantiated on first property access
// at runtime, avoiding build-time crashes when DATABASE_URL is absent.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

