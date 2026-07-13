export type ScrapeRunStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface ScrapeRun {
  id: string;
  status: ScrapeRunStatus;
  discoveredCount: number;
  extractedCount: number;
  finishedAt: Date | null;
  errorMessage: string | null;
}

export interface FinalizeScrapeRunInput {
  status: ScrapeRunStatus;
  discoveredCount: number;
  extractedCount: number;
  errorMessage?: string;
}

export interface IScrapeRunRepository {
  /**
   * Crear una nueva ejecución de scraper en estado RUNNING.
   * 
   * @throws ScraperError con type PERSISTENCE_ERROR si la BD falla
   */
  createRunning(): Promise<ScrapeRun>;

  /**
   * Finalizar una ejecución.
   * Actualiza status, finishedAt y mensaje de error.
   * 
   * @throws ScraperError con type PERSISTENCE_ERROR si la BD falla
   */
  finalize(runId: string, input: FinalizeScrapeRunInput): Promise<void>;
}
