export type ScrapeRunStatus = "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";

export type ScrapeRun = {
  id: string;
  status: ScrapeRunStatus;
  discoveredCount: number;
  extractedCount: number;
  finishedAt: Date | null;
  errorMessage: string | null;
};

export type FinalizeScrapeRunInput = {
  status: Exclude<ScrapeRunStatus, "RUNNING">;
  discoveredCount: number;
  extractedCount: number;
  errorMessage?: string;
};
