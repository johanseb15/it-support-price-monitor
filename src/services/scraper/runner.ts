import type { PrismaClient } from "@prisma/client";

import type { DiscoveredCompany } from "../../domain/entities/discovered-company";
import type { NormalizedService } from "../../domain/entities/normalized-service";
import type { ScrapedPriceCandidate } from "../../domain/entities/scraped-price-candidate";
import type { Company } from "../../domain/entities/company";
import type { FinalizeScrapeRunInput } from "../../domain/entities/scrape-run";
import type { InsertPriceInput, PriceHistoryRecord } from "../../domain/entities/price-history";
import type { ICompanyRepository } from "../../domain/ports/company-repository";
import type { IPriceRepository } from "../../domain/ports/price-repository";
import type { IScrapeRunRepository } from "../../domain/ports/scrape-run-repository";
import {
  runCompleteScrapingPipeline as runPipeline,
  type ScrapingPipelineResult,
} from "../../infrastructure/composition/container";

export type { ScrapingPipelineResult };

type LegacyRunnerDb = Pick<PrismaClient, "scrapeRun" | "company" | "priceHistory">;

export type RunnerDependencies = {
  dbClient?: LegacyRunnerDb;
  discoverCompanies?: () => Promise<DiscoveredCompany[]>;
  extractPrices?: (url: string) => Promise<ScrapedPriceCandidate[]>;
  normalizeService?: (text: string, priceRaw: string) => Promise<NormalizedService>;
  maxCompaniesPerRun?: number;
};

function createLegacyRepositories(dbClient: LegacyRunnerDb): {
  scrapeRunRepository: IScrapeRunRepository;
  companyRepository: ICompanyRepository;
  priceRepository: IPriceRepository;
} {
  return {
    scrapeRunRepository: {
      createRunning: async () => {
        const record = await dbClient.scrapeRun.create({
          data: {
            status: "RUNNING",
            discoveredCount: 0,
            extractedCount: 0,
          },
        });
        return {
          id: record.id,
          status: "RUNNING",
          discoveredCount: record.discoveredCount,
          extractedCount: record.extractedCount,
          finishedAt: record.finishedAt,
          errorMessage: record.errorMessage,
        };
      },
      finalize: async (runId: string, input: FinalizeScrapeRunInput) => {
        await dbClient.scrapeRun.update({
          where: { id: runId },
          data: {
            finishedAt: new Date(),
            status: input.status,
            discoveredCount: input.discoveredCount,
            extractedCount: input.extractedCount,
            errorMessage: input.errorMessage,
          },
        });
      },
    },
    companyRepository: {
      upsertDiscovered: async (company: DiscoveredCompany): Promise<Company> => {
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
          isActive: true,
        };

        let where: { mapsPlaceId: string } | { websiteUrl: string } | null = null;
        if (company.mapsPlaceId) {
          where = { mapsPlaceId: company.mapsPlaceId };
        } else if (company.websiteUrl) {
          where = { websiteUrl: company.websiteUrl };
        }

        if (where) {
          const record = await dbClient.company.upsert({
            where,
            update: baseData,
            create: baseData,
          });
          return record as Company;
        }

        const existing = await dbClient.company.findFirst({
          where: {
            name: company.name,
            address: company.address ?? null,
          },
        });

        if (existing) {
          const record = await dbClient.company.update({
            where: { id: existing.id },
            data: baseData,
          });
          return record as Company;
        }

        const record = await dbClient.company.create({ data: baseData });
        return record as Company;
      },
      findActiveWithWebsite: async (limit: number): Promise<Company[]> => {
        const records = await dbClient.company.findMany({
          where: {
            isActive: true,
            websiteUrl: { not: null },
          },
          orderBy: { lastScrapedAt: "asc" },
          take: limit,
        });
        return records as Company[];
      },
      markScraped: async (companyId: string, scrapedAt: Date) => {
        await dbClient.company.update({
          where: { id: companyId },
          data: { lastScrapedAt: scrapedAt },
        });
      },
    },
    priceRepository: {
      insert: async (input: InsertPriceInput): Promise<PriceHistoryRecord> => {
        const record = await dbClient.priceHistory.create({ data: input });
        return {
          id: record.id,
          companyId: record.companyId,
          supportLevel: record.supportLevel,
          serviceName: record.serviceName,
          extractedPrice: Number(record.extractedPrice),
          currency: record.currency,
          rawText: record.rawText,
          sourceUrl: record.sourceUrl,
          confidence: record.confidence,
        };
      },
    },
  };
}

export async function runCompleteScrapingPipeline(
  dependencies: RunnerDependencies = {},
): Promise<ScrapingPipelineResult> {
  const legacyRepositories = dependencies.dbClient
    ? createLegacyRepositories(dependencies.dbClient)
    : undefined;

  return runPipeline({
    scrapeRunRepository: legacyRepositories?.scrapeRunRepository,
    companyRepository: legacyRepositories?.companyRepository,
    priceRepository: legacyRepositories?.priceRepository,
    companyDiscovery: dependencies.discoverCompanies
      ? { discover: dependencies.discoverCompanies }
      : undefined,
    scraperService: dependencies.extractPrices
      ? { extractPrices: dependencies.extractPrices }
      : undefined,
    priceNormalizer: dependencies.normalizeService
      ? { normalize: dependencies.normalizeService }
      : undefined,
    maxCompaniesPerRun: dependencies.maxCompaniesPerRun,
  });
}
