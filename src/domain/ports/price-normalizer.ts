import type { NormalizedService } from "../entities/normalized-service";

export interface IPriceNormalizer {
  normalize(text: string, priceRaw: string): Promise<NormalizedService>;
}
