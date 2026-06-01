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

  try {
    const parsed = new URL(connectionString);

    if (!parsed.hostname || parsed.hostname.trim() === "") {
      throw new Error("DATABASE_URL must include a valid hostname");
    }
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${(error as Error).message}`);
  }

  const useLibpqCompat = ["1", "true", "yes"].includes(
    process.env.DB_USE_LIBPQ_COMPAT?.trim().toLowerCase() ?? "",
  );

  const allowSelfSignedCert = ["1", "true", "yes"].includes(
    process.env.DB_ALLOW_SELF_SIGNED_CERT?.trim().toLowerCase() ?? "",
  );

  function normalizeConnectionString(conn: string) {
    const parsed = new URL(conn);
    const params = new URLSearchParams(parsed.searchParams);
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

    parsed.search = params.toString();
    return parsed.toString();
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
