import type { InsertPriceInput, PriceHistoryRecord } from "../entities/price-history";

export interface IPriceRepository {
  insert(input: InsertPriceInput): Promise<PriceHistoryRecord>;
}
