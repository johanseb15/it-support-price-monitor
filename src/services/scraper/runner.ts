import type { PrismaClient } from "@prisma/client";

import { db } from "../../../lib/db";
import { env } from "../../../lib/env";
import { discoverCompaniesFromMaps } from "./google-discovery";
import { normalizeData } from "./normalizer";
import { extractPricesFromWebsite } from "./target-extractor";
import type { DiscoveredCompany, NormalizedService, ScrapedServiceRaw } from "./types";

export type ScrapingPipelineResult = {
  ok: boolean;
  runId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  discoveredCount: number;
  extractedCount: number;
  errorCount: number;
  errorMessage?: string;
};

type RunnerDb = Pick<PrismaClient, "scrapeRun" | "company" | "priceHistory">;

type RunnerDependencies = {
  dbClient?: RunnerDb;
  discoverCompanies?: () => Promise<DiscoveredCompany[]>;
  extractPrices?: (url: string) => Promise<ScrapedServiceRaw[]>;
  normalizeService?: (text: string, priceRaw: string) => Promise<NormalizedService>;
  maxCompaniesPerRun?: number;
};

function compactError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function companyWhere(company: DiscoveredCompany) {
  if (company.mapsPlaceId) {
    return { mapsPlaceId: company.mapsPlaceId };
  }

  if (company.websiteUrl) {
    return { websiteUrl: company.websiteUrl };
  }

  return null;
}

async function upsertDiscoveredCompany(dbClient: RunnerDb, company: DiscoveredCompany) {
  const baseData = {
    name: company.name,
    websiteUrl: company.websiteUrl ?? null,
    mapsPlaceId: company.mapsPlaceId ?? null,
    address: company.address ?? null,
    phone: company.phone ?? null,
    city: company.city,
    province: "Cordoba",
    country: "Argentina",
    source: "SERPAPI_GOOGLE_MAPS" as const,
  };
  const where = companyWhere(company);

  if (where) {
    return dbClient.company.upsert({
      where,
      update: baseData,
      create: {
        ...baseData,
        isActive: true,
      },
    });
  }

  const existing = await dbClient.company.findFirst({
    where: {
      name: company.name,
      address: company.address ?? null,
    },
  });

  if (existing) {
    return dbClient.company.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  return dbClient.company.create({
    data: {
      ...baseData,
      isActive: true,
    },
  });
}

export async function runCompleteScrapingPipeline(
  dependencies: RunnerDependencies = {},
): Promise<ScrapingPipelineResult> {
  const dbClient = dependencies.dbClient ?? db;
  const discoverCompanies = dependencies.discoverCompanies ?? discoverCompaniesFromMaps;
  const extractPrices = dependencies.extractPrices ?? extractPricesFromWebsite;
  const normalizeService = dependencies.normalizeService ?? normalizeData;
  const maxCompaniesPerRun = dependencies.maxCompaniesPerRun ?? env.SCRAPER_MAX_COMPANIES_PER_RUN;

  let runId: string | null = null;
  let discoveredCount = 0;
  let extractedCount = 0;
  let errorCount = 0;

  try {
    const run = await dbClient.scrapeRun.create({
      data: {
        status: "RUNNING",
        discoveredCount: 0,
        extractedCount: 0,
      },
    });
    runId = run.id;

    const discoveredCompanies = await discoverCompanies();
    discoveredCount = discoveredCompanies.length;

    for (const company of discoveredCompanies) {
      await upsertDiscoveredCompany(dbClient, company);
    }

    const activeCompanies = await dbClient.company.findMany({
      where: {
        isActive: true,
        websiteUrl: {
          not: null,
        },
      },
      orderBy: {
        lastScrapedAt: "asc",
      },
      take: maxCompaniesPerRun,
    });

    for (const company of activeCompanies) {
      if (!company.websiteUrl) {
        continue;
      }

      try {
        const candidates = await extractPrices(company.websiteUrl);

        for (const candidate of candidates) {
          const normalized = await normalizeService(
            `${candidate.title} ${candidate.text}`.trim(),
            candidate.priceRaw,
          );

          if (!normalized.isValid || normalized.price === null) {
            continue;
          }

          await dbClient.priceHistory.create({
            data: {
              companyId: company.id,
              supportLevel: normalized.supportLevel,
              serviceName: normalized.serviceName,
              extractedPrice: normalized.price,
              currency: "ARS",
              rawText: candidate.text,
              sourceUrl: candidate.sourceUrl,
              confidence: normalized.confidence,
            },
          });
          extractedCount += 1;
        }

        await dbClient.company.update({
          where: { id: company.id },
          data: { lastScrapedAt: new Date() },
        });
      } catch (error) {
        errorCount += 1;
        console.error(`Scraping failed for company ${company.id} (${company.websiteUrl})`, error);
      }
    }

    const status = errorCount > 0 ? "PARTIAL" : "SUCCESS";
    await dbClient.scrapeRun.update({
      where: { id: runId },
      data: {
        finishedAt: new Date(),
        status,
        discoveredCount,
        extractedCount,
      },
    });

    return {
      ok: true,
      runId,
      status,
      discoveredCount,
      extractedCount,
      errorCount,
    };
  } catch (error) {
    const errorMessage = compactError(error);

    if (runId) {
      await dbClient.scrapeRun.update({
        where: { id: runId },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          discoveredCount,
          extractedCount,
          errorMessage,
        },
      });
    }

    return {
      ok: false,
      runId: runId ?? "",
      status: "FAILED",
      discoveredCount,
      extractedCount,
      errorCount,
      errorMessage,
    };
  }
}
