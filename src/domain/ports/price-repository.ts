import type { SupportLevel } from "../value-objects/support-level";

export interface InsertPriceInput {
  companyId: string;
  supportLevel: SupportLevel;
  serviceName: string;
  extractedPrice: number;
  currency: string;
  rawText: string | null;
  sourceUrl: string | null;
  confidence: number;
}

export interface PriceHistoryRecord {
  id: string;
  companyId: string;
  supportLevel: SupportLevel;
  serviceName: string;
  extractedPrice: number;
  currency: string;
  rawText: string | null;
  sourceUrl: string | null;
  confidence: number;
}

export interface IPriceRepository {
  /**
   * Insertar un precio con validación.
   * 
   * Validaciones:
   * - supportLevel debe ser válido (LEVEL_1, LEVEL_2, LEVEL_3, UNKNOWN)
   * - extractedPrice > 0
   * - confidence entre 0 y 1
   * - companyId debe existir en BD
   * 
   * @throws ScraperError con type VALIDATION_ERROR si validación falla
   * @throws ScraperError con type PERSISTENCE_ERROR si la BD falla
   */
  insert(input: InsertPriceInput): Promise<PriceHistoryRecord>;
}
