import type { PrismaClient } from "@prisma/client";

import type { FinalizeScrapeRunInput, ScrapeRun } from "../../../domain/entities/scrape-run";
import type { IScrapeRunRepository } from "../../../domain/ports/scrape-run-repository";

type ScrapeRunDb = Pick<PrismaClient, "scrapeRun">;

export class PrismaScrapeRunRepository implements IScrapeRunRepository {
  constructor(private readonly db: ScrapeRunDb) {}

  async createRunning(): Promise<ScrapeRun> {
    const record = await this.db.scrapeRun.create({
      data: {
        status: "RUNNING",
        discoveredCount: 0,
        extractedCount: 0,
      },
    });

    return {
      id: record.id,
      status: "RUNNING",
      discoveredCount: record.discoveredCount,
      extractedCount: record.extractedCount,
      finishedAt: record.finishedAt,
      errorMessage: record.errorMessage,
    };
  }

  async finalize(runId: string, input: FinalizeScrapeRunInput): Promise<void> {
    await this.db.scrapeRun.update({
      where: { id: runId },
      data: {
        finishedAt: new Date(),
        status: input.status,
        discoveredCount: input.discoveredCount,
        extractedCount: input.extractedCount,
        errorMessage: input.errorMessage,
      },
    });
  }
}
