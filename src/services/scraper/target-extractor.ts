import * as cheerio from "cheerio";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { ScrapedServiceRaw } from "./types";

const MAX_NAVIGATION_TIMEOUT_MS = 30_000;
const POST_LOAD_SETTLE_MS = 2_500;
const MAX_RESULTS_PER_PAGE = 50;
const MIN_TEXT_LENGTH = 5;
const MAX_TEXT_LENGTH = 300;
const PRICE_TEXT_PATTERN = /(?:\$|ars\s*\d|\d[\d\s.,]*\s*pesos?|\bprecio\b|\bdesde\b)/i;
const PRICE_RAW_PATTERN = /(?:\$|ars)?\s*\d[\d\s.,]*(?:\s*pesos?)?/i;
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

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isCandidateText(text: string): boolean {
  return (
    text.length >= MIN_TEXT_LENGTH &&
    text.length <= MAX_TEXT_LENGTH &&
    PRICE_TEXT_PATTERN.test(text)
  );
}

function closestTitle($: ReturnType<typeof cheerio.load>, element: cheerio.Element): string {
  const current = $(element);
  const localLabel = cleanText(
    current
      .prevAll("h1,h2,h3,h4,h5,h6,strong,b,p")
      .first()
      .text(),
  );

  if (localLabel) {
    return localLabel.slice(0, 120);
  }

  const sectionLabel = cleanText(
    current
      .parents("section,article,li,div")
      .first()
      .find("h1,h2,h3,h4,h5,h6,strong,b")
      .first()
      .text(),
  );

  return (sectionLabel || "Precio detectado").slice(0, 120);
}

function extractPriceRaw(text: string): string {
  return cleanText(text.match(PRICE_RAW_PATTERN)?.[0] ?? text);
}

function extractCandidatesFromHtml(html: string, sourceUrl: string): ScrapedServiceRaw[] {
  try {
    const $ = cheerio.load(html);
    const candidates: ScrapedServiceRaw[] = [];
    const seenTexts = new Set<string>();

    $("script,style,noscript,svg").remove();

    $("body")
      .find("h1,h2,h3,h4,h5,h6,p,span,li,a,td,th,small,strong,b,button")
      .each((_, element) => {
        try {
          if (candidates.length >= MAX_RESULTS_PER_PAGE) {
            return false;
          }

          const text = cleanText($(element).text());

          if (!isCandidateText(text) || seenTexts.has(text.toLowerCase())) {
            return;
          }

          seenTexts.add(text.toLowerCase());
          candidates.push({
            title: closestTitle($, element),
            text,
            priceRaw: extractPriceRaw(text),
            sourceUrl,
          });
        } catch (elemError) {
          console.error(`[target-extractor] Error parsing HTML element on ${sourceUrl}:`, elemError);
        }
      });

    return candidates;
  } catch (error) {
    console.error(`[target-extractor] Failed to parse HTML from ${sourceUrl}:`, error);
    return [];
  }
}

async function fetchStaticHtml(url: string): Promise<ScrapedServiceRaw[]> {
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
    return [];
  }

  return extractCandidatesFromHtml(await response.text(), response.url);
}

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

      console.error(
        `Playwright navigation attempt ${attempt} failed for ${url}`,
        error,
      );

      if (attempt < 2) {
        await page.waitForTimeout(1_000);
      }
    }
  }

  throw lastError;
}

export async function extractPricesFromWebsite(url: string): Promise<ScrapedServiceRaw[]> {
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

    const html = await page.content();
    return extractCandidatesFromHtml(html, page.url());
  } catch (error) {
    console.error(`Playwright extraction failed for ${url}; retrying static HTML`, error);

    try {
      return await fetchStaticHtml(url);
    } catch (fallbackError) {
      console.error(`Failed to extract prices from ${url}`, fallbackError);
      return [];
    }
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
