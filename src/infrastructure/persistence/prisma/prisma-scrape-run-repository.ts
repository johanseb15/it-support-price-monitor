import type { PrismaClient } from "@prisma/client";

import type { FinalizeScrapeRunInput, ScrapeRun } from "../../../domain/entities/scrape-run";
import type { IScrapeRunRepository } from "../../../domain/ports/scrape-run-repository";
import { ScraperError } from "../../../domain/errors/scraper-error";
import { getLogger } from "../../logging/logger";

type ScrapeRunDb = Pick<PrismaClient, "scrapeRun">;

const logger = getLogger();

export class PrismaScrapeRunRepository implements IScrapeRunRepository {
  constructor(private readonly db: ScrapeRunDb) {}

  async createRunning(): Promise<ScrapeRun> {
    try {
      logger.info('Creating new scrape run');

      const record = await this.db.scrapeRun.create({
        data: {
          status: "RUNNING",
          discoveredCount: 0,
          extractedCount: 0,
        },
      });

      logger.info('Scrape run created', {
        runId: record.id,
      });

      return {
        id: record.id,
        status: "RUNNING",
        discoveredCount: record.discoveredCount,
        extractedCount: record.extractedCount,
        finishedAt: record.finishedAt,
        errorMessage: record.errorMessage,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create scrape run', error);

      throw new ScraperError(
        'PERSISTENCE_ERROR',
        `Failed to create scrape run: ${message}`,
        {
          cause: error,
          recoverable: false,
        }
      );
    }
  }

  async finalize(runId: string, input: FinalizeScrapeRunInput): Promise<void> {
    try {
      if (!runId || runId.trim().length === 0) {
        throw new ScraperError('VALIDATION_ERROR', 'Run ID cannot be empty', {
          context: { runId },
          recoverable: false,
        });
      }

      if (!['SUCCESS', 'PARTIAL', 'FAILED'].includes(input.status)) {
        throw new ScraperError('VALIDATION_ERROR', `Invalid status: ${input.status}`, {
          context: { status: input.status },
          recoverable: false,
        });
      }

      logger.info('Finalizing scrape run', {
        runId,
        status: input.status,
        discovered: input.discoveredCount,
        extracted: input.extractedCount,
      });

      await this.db.scrapeRun.update({
        where: { id: runId },
        data: {
          finishedAt: new Date(),
          status: input.status,
          discoveredCount: input.discoveredCount,
          extractedCount: input.extractedCount,
          errorMessage: input.errorMessage ?? null,
        },
      });

      logger.info('Scrape run finalized', {
        runId,
        status: input.status,
      });
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to finalize scrape run', error, { runId });

      throw new ScraperError(
        'PERSISTENCE_ERROR',
        `Failed to finalize scrape run: ${message}`,
        {
          cause: error,
          context: { runId },
          recoverable: true,
        }
      );
    }
  }
}
