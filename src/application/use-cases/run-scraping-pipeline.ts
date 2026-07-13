import { compactError } from "../../domain/errors/compact-error";
import type { ICompanyRepository } from "../../domain/ports/company-repository";
import type { ICompanyDiscoveryService } from "../../domain/ports/company-discovery-service";
import type { IPriceNormalizer } from "../../domain/ports/price-normalizer";
import type { IPriceRepository } from "../../domain/ports/price-repository";
import type { IScrapeRunRepository } from "../../domain/ports/scrape-run-repository";
import type { IScraperService } from "../../domain/ports/scraper-service";
import type { ScrapingPipelineResult } from "../dto/scraping-results";
import { DiscoverCompanies } from "./discover-companies";
import { ExecuteScrapingForCompany } from "./execute-scraping-for-company";

export type RunScrapingPipelineDependencies = {
  scrapeRunRepository: IScrapeRunRepository;
  companyRepository: ICompanyRepository;
  companyDiscovery: ICompanyDiscoveryService;
  scraperService: IScraperService;
  priceNormalizer: IPriceNormalizer;
  priceRepository: IPriceRepository;
  maxCompaniesPerRun: number;
};

export class RunScrapingPipeline {
  private readonly discoverCompanies: DiscoverCompanies;
  private readonly executeScrapingForCompany: ExecuteScrapingForCompany;

  constructor(private readonly dependencies: RunScrapingPipelineDependencies) {
    this.discoverCompanies = new DiscoverCompanies({
      companyDiscovery: dependencies.companyDiscovery,
      companyRepository: dependencies.companyRepository,
    });

    this.executeScrapingForCompany = new ExecuteScrapingForCompany({
      scraperService: dependencies.scraperService,
      priceNormalizer: dependencies.priceNormalizer,
      priceRepository: dependencies.priceRepository,
      companyRepository: dependencies.companyRepository,
    });
  }

  async execute(): Promise<ScrapingPipelineResult> {
    let runId: string | null = null;
    let discoveredCount = 0;
    let extractedCount = 0;
    let errorCount = 0;
    let discoveryErrorMessage: string | null = null;
    const companyErrorMessages: string[] = [];

    try {
      const run = await this.dependencies.scrapeRunRepository.createRunning();
      runId = run.id;

      const discoveryResult = await this.discoverCompanies.execute();
      discoveredCount = discoveryResult.companies.length;
      discoveryErrorMessage = discoveryResult.errorMessage ?? null;

      const activeCompanies = await this.dependencies.companyRepository.findActiveWithWebsite(
        this.dependencies.maxCompaniesPerRun,
      );

      for (const company of activeCompanies) {
        const companyResult = await this.executeScrapingForCompany.execute({ company });

        extractedCount += companyResult.extractedCount;

        if (companyResult.errorMessage) {
          errorCount += 1;
          companyErrorMessages.push(companyResult.errorMessage);
        }
      }

      const status = errorCount > 0 || discoveryErrorMessage !== null ? "PARTIAL" : "SUCCESS";
      const errorMessage = [discoveryErrorMessage, ...companyErrorMessages].filter(Boolean).join(" | ");

      await this.dependencies.scrapeRunRepository.finalize(runId, {
        status,
        discoveredCount,
        extractedCount,
        errorMessage: errorMessage || undefined,
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
        await this.dependencies.scrapeRunRepository.finalize(runId, {
          status: "FAILED",
          discoveredCount,
          extractedCount,
          errorMessage,
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
}
