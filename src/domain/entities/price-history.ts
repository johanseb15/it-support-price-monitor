import type { SupportLevel } from "../value-objects/support-level";

export type PriceHistoryRecord = {
  id: string;
  companyId: string;
  supportLevel: SupportLevel;
  serviceName: string;
  extractedPrice: number;
  currency: string;
  rawText: string | null;
  sourceUrl: string | null;
  confidence: number;
};

export type InsertPriceInput = {
  companyId: string;
  supportLevel: SupportLevel;
  serviceName: string;
  extractedPrice: number;
  currency: string;
  rawText: string;
  sourceUrl: string;
  confidence: number;
};
