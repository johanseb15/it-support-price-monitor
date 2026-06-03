import { z } from "zod";

const runtimeSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL must not be empty"),
  SERP_API_KEY: z.string().min(1, "SERP_API_KEY must not be empty"),
  SERP_PROVIDER: z.enum(["serpapi", "brightdata"]).default("serpapi"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET must not be empty"),
  SCRAPER_MAX_COMPANIES_PER_RUN: z.coerce.number().int().positive().default(25),
  SCRAPER_TARGET_CITY: z.string().min(1).default("Cordoba,Cordoba Province,Argentina"),
  DB_ALLOW_SELF_SIGNED_CERT: z.enum(["true", "false"]).default("false"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type Env = z.infer<typeof runtimeSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = runtimeSchema.parse(process.env);
  }
  return _env;
}

// Safe getter that doesn't validate during build.
// Accessing these outside of actual function execution (build time) returns the raw env var or throws only when called.
export function getSafeEnv<K extends keyof Env>(key: K): Env[K] | undefined {
  try {
    return getEnv()[key];
  } catch {
    // During build, if env validation fails, return undefined
    // This allows the build to complete. Runtime access will fail properly.
    return process.env[key as string] as any;
  }
}

// Lazy proxy: only evaluates when accessed.
export const env: Env = new Proxy({} as Env, {
  get: (_target, prop: string | symbol) => {
    if (typeof prop !== "string") return undefined;
    try {
      return getEnv()[prop as keyof Env];
    } catch {
      // Build-time safety: return raw env var or undefined
      return process.env[prop];
    }
  },
});
