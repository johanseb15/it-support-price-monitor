-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SupportLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DiscoverySource" AS ENUM ('SERPAPI_GOOGLE_MAPS', 'SERPAPI_GOOGLE_SEARCH', 'MANUAL');

-- CreateTable
CREATE TABLE "Company" (
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

-- CreateTable
CREATE TABLE "PriceHistory" (
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

-- CreateTable
CREATE TABLE "ScrapeRun" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Company_websiteUrl_key" ON "Company"("websiteUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Company_mapsPlaceId_key" ON "Company"("mapsPlaceId");

-- CreateIndex
CREATE INDEX "Company_city_isActive_idx" ON "Company"("city", "isActive");

-- CreateIndex
CREATE INDEX "PriceHistory_supportLevel_idx" ON "PriceHistory"("supportLevel");

-- CreateIndex
CREATE INDEX "PriceHistory_scrapedAt_idx" ON "PriceHistory"("scrapedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_companyId_scrapedAt_idx" ON "PriceHistory"("companyId", "scrapedAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_startedAt_idx" ON "ScrapeRun"("startedAt");

-- CreateIndex
CREATE INDEX "ScrapeRun_status_idx" ON "ScrapeRun"("status");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapeRun" ADD CONSTRAINT "ScrapeRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
