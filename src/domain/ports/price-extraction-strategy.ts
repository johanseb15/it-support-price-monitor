import type { ScrapedPriceCandidate } from "../entities/scraped-price-candidate";

export interface IPriceExtractionStrategy {
  readonly name: string;
  canHandle(url: string): boolean;
  extractFromHtml(html: string, sourceUrl: string): ScrapedPriceCandidate[];
}
