import { KeywordPriceNormalizer } from "../../infrastructure/scraping/normalizers/keyword-price-normalizer";

const defaultNormalizer = new KeywordPriceNormalizer();

export async function normalizeData(text: string, priceRaw: string) {
  return defaultNormalizer.normalize(text, priceRaw);
}

export { KeywordPriceNormalizer };
