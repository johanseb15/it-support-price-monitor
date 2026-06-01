-- Ejecutar en Supabase SQL Editor si migrate deploy no puede conectar.
-- Idempotente: ignora errores si los tipos/tablas ya existen.

DO $$ BEGIN
  CREATE TYPE "SupportLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DiscoverySource" AS ENUM ('SERPAPI_GOOGLE_MAPS', 'SERPAPI_GOOGLE_SEARCH', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "mapsPlaceId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Cordoba',
    "province" TEXT NOT NULL DEFAULT 'Cordoba',
    "country" TEXT NOT NULL DEFAULT 'Argentina',
    "source" "DiscoverySource" NOT NULL DEFAULT 'SERPAPI_GOOGLE_MAPS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PriceHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supportLevel" "SupportLevel" NOT NULL,
    "serviceName" TEXT NOT NULL,
    "extractedPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "rawText" TEXT,
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScrapeRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "discoveredCount" INTEGER NOT NULL DEFAULT 0,
    "extractedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Company_websiteUrl_key" ON "Company"("websiteUrl");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_mapsPlaceId_key" ON "Company"("mapsPlaceId");
CREATE INDEX IF NOT EXISTS "Company_city_isActive_idx" ON "Company"("city", "isActive");
CREATE INDEX IF NOT EXISTS "PriceHistory_supportLevel_idx" ON "PriceHistory"("supportLevel");
CREATE INDEX IF NOT EXISTS "PriceHistory_scrapedAt_idx" ON "PriceHistory"("scrapedAt");
CREATE INDEX IF NOT EXISTS "PriceHistory_companyId_scrapedAt_idx" ON "PriceHistory"("companyId", "scrapedAt");
CREATE INDEX IF NOT EXISTS "ScrapeRun_startedAt_idx" ON "ScrapeRun"("startedAt");
CREATE INDEX IF NOT EXISTS "ScrapeRun_status_idx" ON "ScrapeRun"("status");

DO $$ BEGIN
  ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
SELECT '20260528170000_init', 'manual', NOW(), '20260528170000_init', 1
WHERE NOT EXISTS (
  SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260528170000_init'
);
