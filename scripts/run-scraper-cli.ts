import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

  const missingVariables = ["DATABASE_URL", "SERP_API_KEY"].filter(
    (key) => !process.env[key]?.trim(),
  );

  if (missingVariables.length > 0) {
    console.error(
      `[scraper] Missing required environment variables: ${missingVariables.join(", ")}`,
    );
    process.exit(1);
    return;
  }

  const { runCompleteScrapingPipeline } = await import("../src/services/scraper/runner");

  console.log("[scraper] Starting complete scraping pipeline...");

  const startedAt = Date.now();
  const result = await runCompleteScrapingPipeline();
  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`[scraper] ScrapeRun: ${result.runId || "not-created"}`);
  console.log(`[scraper] Status: ${result.status}`);
  console.log(`[scraper] Discovered companies: ${result.discoveredCount}`);
  console.log(`[scraper] Extracted prices: ${result.extractedCount}`);
  console.log(`[scraper] Individual company errors: ${result.errorCount}`);
  if (result.errorMessage) {
    console.error(`[scraper] Error: ${result.errorMessage}`);
  }
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
