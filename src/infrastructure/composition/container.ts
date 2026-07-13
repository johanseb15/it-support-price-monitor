import { db } from "../../../lib/db";
import { env } from "../../../lib/env";
import type { RunScrapingPipelineDependencies } from "../../application/use-cases/run-scraping-pipeline";
import { RunScrapingPipeline } from "../../application/use-cases/run-scraping-pipeline";
import type { ScrapingPipelineResult } from "../../application/dto/scraping-results";
import type { ICompanyDiscoveryService } from "../../domain/ports/company-discovery-service";
import type { ICompanyRepository } from "../../domain/ports/company-repository";
import type { IPriceNormalizer } from "../../domain/ports/price-normalizer";
import type { IPriceRepository } from "../../domain/ports/price-repository";
import type { IScrapeRunRepository } from "../../domain/ports/scrape-run-repository";
import type { IScraperService } from "../../domain/ports/scraper-service";
import { PrismaCompanyRepository } from "../persistence/prisma/prisma-company-repository";
import { PrismaPriceRepository } from "../persistence/prisma/prisma-price-repository";
import { PrismaScrapeRunRepository } from "../persistence/prisma/prisma-scrape-run-repository";
import { ScraperEngineFactory } from "../scraping/factories/scraper-engine-factory";
import { KeywordPriceNormalizer } from "../scraping/normalizers/keyword-price-normalizer";
import { SerpApiCompanyDiscoveryService } from "../scraping/serpapi/serp-api-company-discovery";
import { PriceExtractionStrategyRegistry } from "../scraping/strategies/price-extraction-strategy-registry";
import { WebsiteScraperService } from "../scraping/website-scraper-service";

export type ScraperContainerOverrides = Partial<{
  scrapeRunRepository: IScrapeRunRepository;
  companyRepository: ICompanyRepository;
  priceRepository: IPriceRepository;
  companyDiscovery: ICompanyDiscoveryService;
  scraperService: IScraperService;
  priceNormalizer: IPriceNormalizer;
  maxCompaniesPerRun: number;
}>;

export type ScraperContainer = {
  runScrapingPipeline: RunScrapingPipeline;
  dependencies: RunScrapingPipelineDependencies;
};

export function createScraperContainer(overrides: ScraperContainerOverrides = {}): ScraperContainer {
  const scrapeRunRepository =
    overrides.scrapeRunRepository ?? new PrismaScrapeRunRepository(db);
  const companyRepository =
    overrides.companyRepository ?? new PrismaCompanyRepository(db);
  const priceRepository = overrides.priceRepository ?? new PrismaPriceRepository(db);
  const companyDiscovery =
    overrides.companyDiscovery ?? new SerpApiCompanyDiscoveryService();
  const scraperService =
    overrides.scraperService ??
    new WebsiteScraperService(
      new ScraperEngineFactory(),
      PriceExtractionStrategyRegistry.createDefault(),
    );
  const priceNormalizer = overrides.priceNormalizer ?? new KeywordPriceNormalizer();

  const dependencies: RunScrapingPipelineDependencies = {
    scrapeRunRepository,
    companyRepository,
    priceRepository,
    companyDiscovery,
    scraperService,
    priceNormalizer,
    maxCompaniesPerRun: overrides.maxCompaniesPerRun ?? env.SCRAPER_MAX_COMPANIES_PER_RUN,
  };

  return {
    runScrapingPipeline: new RunScrapingPipeline(dependencies),
    dependencies,
  };
}

export async function runCompleteScrapingPipeline(
  overrides: ScraperContainerOverrides = {},
): Promise<ScrapingPipelineResult> {
  const container = createScraperContainer(overrides);
  return container.runScrapingPipeline.execute();
}

export type { ScrapingPipelineResult };
