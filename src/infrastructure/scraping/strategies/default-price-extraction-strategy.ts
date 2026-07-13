import * as cheerio from "cheerio";

import type { ScrapedPriceCandidate } from "../../../domain/entities/scraped-price-candidate";
import type { IPriceExtractionStrategy } from "../../../domain/ports/price-extraction-strategy";

const MAX_RESULTS_PER_PAGE = 50;
const MIN_TEXT_LENGTH = 5;
const MAX_TEXT_LENGTH = 300;
const PRICE_TEXT_PATTERN = /(?:\$|ars\s*\d|\d[\d\s.,]*\s*pesos?|\bprecio\b|\bdesde\b)/i;
const PRICE_RAW_PATTERN = /(?:\$|ars)?\s*\d[\d\s.,]*(?:\s*pesos?)?/i;

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

export class DefaultPriceExtractionStrategy implements IPriceExtractionStrategy {
  readonly name = "default";

  canHandle(url: string): boolean {
    void url;
    return true;
  }

  extractFromHtml(html: string, sourceUrl: string): ScrapedPriceCandidate[] {
    try {
      const $ = cheerio.load(html);
      const candidates: ScrapedPriceCandidate[] = [];
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
            console.error(
              `[target-extractor] Error parsing HTML element on ${sourceUrl}:`,
              elemError,
            );
          }
        });

      return candidates;
    } catch (error) {
      console.error(`[target-extractor] Failed to parse HTML from ${sourceUrl}:`, error);
      return [];
    }
  }
}
