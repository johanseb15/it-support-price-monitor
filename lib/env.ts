import { z } from "zod";

function isValidPostgresUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

const runtimeSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, "DATABASE_URL must not be empty")
    .refine((value) => !/\s/.test(value), "DATABASE_URL must not contain whitespace")
    .refine(
      isValidPostgresUrl,
      "DATABASE_URL must be a valid PostgreSQL URL, for example postgresql://user:password@host:5432/database?schema=public",
    ),
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

export function validateRuntimeEnv() {
  const result = runtimeSchema.safeParse(process.env);

  if (result.success) {
    return {
      ok: true as const,
      errors: [],
    };
  }

  return {
    ok: false as const,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join(".") || "environment";
      return `${path}: ${issue.message}`;
    }),
  };
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
