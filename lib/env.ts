import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().url(),
  SERP_API_KEY: z.string().min(1),
  SERP_PROVIDER: z.enum(["serpapi", "brightdata"]).default("serpapi"),
  CRON_SECRET: z.string().min(1),
  SCRAPER_MAX_COMPANIES_PER_RUN: z.coerce.number().int().positive().default(25),
  SCRAPER_TARGET_CITY: z.string().min(1).default("Cordoba,Cordoba Province,Argentina"),
  DB_ALLOW_SELF_SIGNED_CERT: z.enum(["true", "false"]).default("false"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
