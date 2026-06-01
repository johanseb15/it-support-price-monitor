import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool, type PoolConfig } from "pg";

function isLocalDatabase(connectionString: string) {
  return /localhost|127\.0\.0\.1/.test(connectionString);
}

function createPgPool(connectionString: string) {
  connectionString = connectionString.trim();

  if (/\s/.test(connectionString)) {
    throw new Error("DATABASE_URL must not contain whitespace");
  }

  const useLibpqCompat = ["1", "true", "yes"].includes(
    process.env.DB_USE_LIBPQ_COMPAT?.trim().toLowerCase() ?? "",
  );

  const allowSelfSignedCert = ["1", "true", "yes"].includes(
    process.env.DB_ALLOW_SELF_SIGNED_CERT?.trim().toLowerCase() ?? "",
  );
  function normalizeConnectionString(conn: string) {
    const questionIndex = conn.indexOf("?");
    const basePart = questionIndex > -1 ? conn.substring(0, questionIndex) : conn;
    const queryPart = questionIndex > -1 ? conn.substring(questionIndex + 1) : "";
    const params = new URLSearchParams(queryPart);
    const sslmode = params.get("sslmode")?.toLowerCase();
    const hasLibpqCompat = params.has("uselibpqcompat");
    const local = isLocalDatabase(conn);

    if (local) {
      if (!sslmode && !hasLibpqCompat) {
        params.set("sslmode", "disable");
      }
    } else if (allowSelfSignedCert) {
      params.set("uselibpqcompat", "true");
      params.set("sslmode", "require");
    } else {
      if (sslmode && ["require", "prefer", "verify-ca"].includes(sslmode) && !hasLibpqCompat) {
        if (useLibpqCompat) {
          params.set("uselibpqcompat", "true");
          params.set("sslmode", "require");
        } else {
          params.set("sslmode", "verify-full");
        }
      }

      if (!sslmode && !hasLibpqCompat) {
        if (useLibpqCompat) {
          params.set("uselibpqcompat", "true");
          params.set("sslmode", "require");
        } else {
          params.set("sslmode", "verify-full");
        }
      }
    }

    const newQuery = params.toString();
    return newQuery ? `${basePart}?${newQuery}` : basePart;
  }

  const poolConfig: PoolConfig = {
    connectionString: normalizeConnectionString(connectionString),
  };

  if (allowSelfSignedCert) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new Pool(poolConfig);
}

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = createPgPool(connectionString);
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}
