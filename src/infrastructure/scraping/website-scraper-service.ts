import type { ScrapedPriceCandidate } from "../../domain/entities/scraped-price-candidate";
import type { IScraperService } from "../../domain/ports/scraper-service";
import type { ScraperEngineFactory } from "./factories/scraper-engine-factory";
import type { PriceExtractionStrategyRegistry } from "./strategies/price-extraction-strategy-registry";

export class WebsiteScraperService implements IScraperService {
  constructor(
    private readonly engineFactory: ScraperEngineFactory,
    private readonly strategyRegistry: PriceExtractionStrategyRegistry,
  ) {}

  async extractPrices(url: string): Promise<ScrapedPriceCandidate[]> {
    const { primary, fallback } = this.engineFactory.createDefaultPipeline();
    const strategy = this.strategyRegistry.resolve(url);

    try {
      const rendered = await primary.fetchRenderedHtml(url);
      return strategy.extractFromHtml(rendered.html, rendered.sourceUrl);
    } catch (error) {
      console.error(`Playwright extraction failed for ${url}; retrying static HTML`, error);

      try {
        const staticHtml = await fallback.fetchRenderedHtml(url);
        return strategy.extractFromHtml(staticHtml.html, staticHtml.sourceUrl);
      } catch (fallbackError) {
        console.error(`Failed to extract prices from ${url}`, fallbackError);
        return [];
      }
    }
  }
}
