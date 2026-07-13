import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { IScraperEngine, ScrapedHtml } from "../../../domain/ports/scraper-service";

const MAX_NAVIGATION_TIMEOUT_MS = 30_000;
const POST_LOAD_SETTLE_MS = 2_500;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const PLAYWRIGHT_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-background-networking",
];
const BLOCKED_RESOURCE_TYPES = ["image", "media", "font", "stylesheet", "other"];

function blockUnnecessaryRequests(page: Page) {
  void page.route("**/*", async (route) => {
    const resourceType = route.request().resourceType();
    if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

async function waitForPageLoad(page: Page, url: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: MAX_NAVIGATION_TIMEOUT_MS,
      });

      if (response && response.status() >= 400) {
        throw new Error(`Received HTTP ${response.status()} for ${url}`);
      }

      await page.waitForTimeout(POST_LOAD_SETTLE_MS * attempt);
      await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
      return;
    } catch (error) {
      lastError = error;

      console.error(`Playwright navigation attempt ${attempt} failed for ${url}`, error);

      if (attempt < 2) {
        await page.waitForTimeout(1_000);
      }
    }
  }

  throw lastError;
}

export class PlaywrightScraperEngine implements IScraperEngine {
  async fetchRenderedHtml(url: string): Promise<ScrapedHtml> {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: PLAYWRIGHT_LAUNCH_ARGS,
      });

      context = await browser.newContext({
        userAgent: USER_AGENT,
        viewport: { width: 1366, height: 768 },
      });

      const page = await context.newPage();
      await page.setDefaultNavigationTimeout(MAX_NAVIGATION_TIMEOUT_MS);
      await page.setDefaultTimeout(MAX_NAVIGATION_TIMEOUT_MS);
      await blockUnnecessaryRequests(page);
      await waitForPageLoad(page, url);

      return {
        html: await page.content(),
        sourceUrl: page.url(),
      };
    } finally {
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  }
}
