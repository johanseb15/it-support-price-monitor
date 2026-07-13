export type ScrapingPipelineResult = {
  ok: boolean;
  runId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  discoveredCount: number;
  extractedCount: number;
  errorCount: number;
  errorMessage?: string;
};

export type ExecuteScrapingForCompanyResult = {
  extractedCount: number;
  errorMessage?: string;
};
