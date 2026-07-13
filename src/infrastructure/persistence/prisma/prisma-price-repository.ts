import type { PrismaClient } from "@prisma/client";

import type { InsertPriceInput, PriceHistoryRecord } from "../../../domain/entities/price-history";
import type { IPriceRepository } from "../../../domain/ports/price-repository";
import type { SupportLevel } from "../../../domain/value-objects/support-level";

type PriceDb = Pick<PrismaClient, "priceHistory">;

export class PrismaPriceRepository implements IPriceRepository {
  constructor(private readonly db: PriceDb) {}

  async insert(input: InsertPriceInput): Promise<PriceHistoryRecord> {
    const record = await this.db.priceHistory.create({
      data: {
        companyId: input.companyId,
        supportLevel: input.supportLevel as SupportLevel,
        serviceName: input.serviceName,
        extractedPrice: input.extractedPrice,
        currency: input.currency,
        rawText: input.rawText,
        sourceUrl: input.sourceUrl,
        confidence: input.confidence,
      },
    });

    return {
      id: record.id,
      companyId: record.companyId,
      supportLevel: record.supportLevel as SupportLevel,
      serviceName: record.serviceName,
      extractedPrice: Number(record.extractedPrice),
      currency: record.currency,
      rawText: record.rawText,
      sourceUrl: record.sourceUrl,
      confidence: record.confidence,
    };
  }
}
