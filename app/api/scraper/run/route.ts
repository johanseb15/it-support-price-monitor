import { NextResponse } from "next/server";

import { env } from "../../../../lib/env";
import { runCompleteScrapingPipeline } from "../../../../src/services/scraper/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCompleteScrapingPipeline();

  return NextResponse.json(
    {
      ok: result.ok,
      runId: result.runId,
      discoveredCount: result.discoveredCount,
      extractedCount: result.extractedCount,
      status: result.status,
      errorCount: result.errorCount,
      errorMessage: result.errorMessage,
    },
    { status: result.ok ? 200 : 500 },
  );
}
