import type { PrismaClient } from "@prisma/client";

import type { InsertPriceInput, PriceHistoryRecord } from "../../../domain/entities/price-history";
import type { IPriceRepository } from "../../../domain/ports/price-repository";
import type { SupportLevel } from "../../../domain/value-objects/support-level";
import { ScraperError } from "../../../domain/errors/scraper-error";
import { getLogger } from "../../logging/logger";

type PriceDb = Pick<PrismaClient, "priceHistory">;

const logger = getLogger();

const VALID_SUPPORT_LEVELS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'UNKNOWN'];

/**
 * Validar que el precio tenga todos los campos requeridos y sean válidos.
 */
function validatePriceInput(input: InsertPriceInput): void {
  if (!input.companyId || input.companyId.trim().length === 0) {
    throw new ScraperError('VALIDATION_ERROR', 'Company ID cannot be empty', {
      context: { input },
      recoverable: false,
    });
  }

  if (!VALID_SUPPORT_LEVELS.includes(input.supportLevel)) {
    throw new ScraperError(
      'VALIDATION_ERROR',
      `Invalid support level: ${input.supportLevel}. Must be one of: ${VALID_SUPPORT_LEVELS.join(', ')}`,
      {
        context: { input },
        recoverable: false,
      }
    );
  }

  if (!input.serviceName || input.serviceName.trim().length === 0) {
    throw new ScraperError('VALIDATION_ERROR', 'Service name cannot be empty', {
      context: { input },
      recoverable: false,
    });
  }

  if (input.serviceName.length > 500) {
    throw new ScraperError(
      'VALIDATION_ERROR',
      'Service name is too long (max 500 chars)',
      {
        context: { input },
        recoverable: false,
      }
    );
  }

  if (typeof input.extractedPrice !== 'number' || input.extractedPrice <= 0) {
    throw new ScraperError(
      'VALIDATION_ERROR',
      `Invalid price: ${input.extractedPrice}. Must be a positive number.`,
      {
        context: { input },
        recoverable: false,
      }
    );
  }

  if (!input.currency || input.currency.trim().length === 0) {
    throw new ScraperError('VALIDATION_ERROR', 'Currency cannot be empty', {
      context: { input },
      recoverable: false,
    });
  }

  if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
    throw new ScraperError(
      'VALIDATION_ERROR',
      `Invalid confidence: ${input.confidence}. Must be a number between 0 and 1.`,
      {
        context: { input },
        recoverable: false,
      }
    );
  }
}

export class PrismaPriceRepository implements IPriceRepository {
  constructor(private readonly db: PriceDb) {}

  async insert(input: InsertPriceInput): Promise<PriceHistoryRecord> {
    try {
      // Validar datos de entrada
      validatePriceInput(input);

      logger.debug('Inserting price record', {
        companyId: input.companyId,
        supportLevel: input.supportLevel,
        price: input.extractedPrice,
        confidence: input.confidence,
      });

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

      logger.debug('Price record inserted successfully', {
        priceId: record.id,
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
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to insert price record', error, {
        companyId: input.companyId,
      });

      throw new ScraperError('PERSISTENCE_ERROR', `Failed to insert price: ${message}`, {
        cause: error,
        context: { companyId: input.companyId },
        recoverable: true,
      });
    }
  }
}
