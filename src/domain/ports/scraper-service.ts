import type { ScrapedPriceCandidate } from "../entities/scraped-price-candidate";

export interface IScraperService {
  extractPrices(url: string): Promise<ScrapedPriceCandidate[]>;
}

export type ScrapedHtml = {
  html: string;
  sourceUrl: string;
};

export interface IScraperEngine {
  fetchRenderedHtml(url: string): Promise<ScrapedHtml>;
}

export type ScraperEngineType = "playwright" | "static";
