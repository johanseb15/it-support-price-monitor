import type { IScraperEngine, ScraperEngineType } from "../../../domain/ports/scraper-service";
import { PlaywrightScraperEngine } from "../engines/playwright-scraper-engine";
import { StaticHtmlScraperEngine } from "../engines/static-html-scraper-engine";

export class ScraperEngineFactory {
  create(type: ScraperEngineType): IScraperEngine {
    switch (type) {
      case "playwright":
        return new PlaywrightScraperEngine();
      case "static":
        return new StaticHtmlScraperEngine();
      default: {
        const exhaustive: never = type;
        throw new Error(`Unsupported scraper engine type: ${exhaustive}`);
      }
    }
  }

  createDefaultPipeline(): { primary: IScraperEngine; fallback: IScraperEngine } {
    return {
      primary: this.create("playwright"),
      fallback: this.create("static"),
    };
  }
}
