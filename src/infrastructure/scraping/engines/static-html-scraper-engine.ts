import type { IScraperEngine, ScrapedHtml } from "../../../domain/ports/scraper-service";

const MAX_NAVIGATION_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class StaticHtmlScraperEngine implements IScraperEngine {
  async fetchRenderedHtml(url: string): Promise<ScrapedHtml> {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(MAX_NAVIGATION_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Static HTML request failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("html")) {
      return { html: "", sourceUrl: response.url };
    }

    return {
      html: await response.text(),
      sourceUrl: response.url,
    };
  }
}
