import type { FinalizeScrapeRunInput, ScrapeRun } from "../entities/scrape-run";

export interface IScrapeRunRepository {
  createRunning(): Promise<ScrapeRun>;
  finalize(runId: string, input: FinalizeScrapeRunInput): Promise<void>;
}
