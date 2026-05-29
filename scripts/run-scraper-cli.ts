import { runCompleteScrapingPipeline } from "../src/services/scraper/runner";

async function main() {
  console.log("[scraper] Starting complete scraping pipeline...");

  const startedAt = Date.now();
  const result = await runCompleteScrapingPipeline();
  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`[scraper] ScrapeRun: ${result.runId || "not-created"}`);
  console.log(`[scraper] Status: ${result.status}`);
  console.log(`[scraper] Discovered companies: ${result.discoveredCount}`);
  console.log(`[scraper] Extracted prices: ${result.extractedCount}`);
  console.log(`[scraper] Individual company errors: ${result.errorCount}`);
  console.log(`[scraper] Finished in ${durationSeconds}s`);

  if (!result.ok) {
    console.error("[scraper] Pipeline failed. Check ScrapeRun.errorMessage for details.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[scraper] Fatal CLI error", error);
  process.exitCode = 1;
});
