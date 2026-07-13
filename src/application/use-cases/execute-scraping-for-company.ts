import type { Company } from "../../domain/entities/company";
import type { IPriceRepository } from "../../domain/ports/price-repository";
import type { IPriceNormalizer } from "../../domain/ports/price-normalizer";
import type { IScraperService } from "../../domain/ports/scraper-service";
import type { ICompanyRepository } from "../../domain/ports/company-repository";
import { compactError } from "../../domain/errors/compact-error";
import type { ExecuteScrapingForCompanyResult } from "../dto/scraping-results";

export type ExecuteScrapingForCompanyInput = {
  company: Company;
};

export type ExecuteScrapingForCompanyDependencies = {
  scraperService: IScraperService;
  priceNormalizer: IPriceNormalizer;
  priceRepository: IPriceRepository;
  companyRepository: ICompanyRepository;
};

export class ExecuteScrapingForCompany {
  constructor(private readonly dependencies: ExecuteScrapingForCompanyDependencies) {}

  async execute(input: ExecuteScrapingForCompanyInput): Promise<ExecuteScrapingForCompanyResult> {
    const { company } = input;

    if (!company.websiteUrl) {
      return { extractedCount: 0 };
    }

    console.log(`[scraper] Processing company: ${company.name} (${company.websiteUrl})`);

    try {
      const candidates = await this.dependencies.scraperService.extractPrices(company.websiteUrl);
      console.log(
        `[scraper] Extracted ${candidates.length} candidate elements from ${company.name}`,
      );

      let extractedCount = 0;

      for (const candidate of candidates) {
        try {
          const normalized = await this.dependencies.priceNormalizer.normalize(
            `${candidate.title} ${candidate.text}`.trim(),
            candidate.priceRaw,
          );

          if (!normalized.isValid || normalized.price === null) {
            continue;
          }

          await this.dependencies.priceRepository.insert({
            companyId: company.id,
            supportLevel: normalized.supportLevel,
            serviceName: normalized.serviceName,
            extractedPrice: normalized.price,
            currency: "ARS",
            rawText: candidate.text,
            sourceUrl: candidate.sourceUrl,
            confidence: normalized.confidence,
          });

          extractedCount += 1;
        } catch (candidateError) {
          console.error(
            `[scraper] Failed to process/save candidate service for company ${company.name} (${company.id}): ${compactError(candidateError)}`,
            candidateError,
          );
        }
      }

      console.log(`[scraper] Successfully saved ${extractedCount} prices for ${company.name}`);

      await this.dependencies.companyRepository.markScraped(company.id, new Date());

      return { extractedCount };
    } catch (error) {
      const errorMessage = `Scraping failed for company ${company.id} (${company.websiteUrl}): ${compactError(error)}`;
      console.error(`[scraper] ${errorMessage}`, error);
      return { extractedCount: 0, errorMessage };
    }
  }
}
