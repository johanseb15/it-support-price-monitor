import { ScraperEngineFactory } from "./factories/scraper-engine-factory";
import { PriceExtractionStrategyRegistry } from "./strategies/price-extraction-strategy-registry";
import { WebsiteScraperService } from "./website-scraper-service";

const defaultScraperService = new WebsiteScraperService(
  new ScraperEngineFactory(),
  PriceExtractionStrategyRegistry.createDefault(),
);

export async function extractPricesFromWebsite(url: string) {
  return defaultScraperService.extractPrices(url);
}
