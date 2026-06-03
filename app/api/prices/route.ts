import { NextResponse } from "next/server";
import type { Prisma, SupportLevel } from "@prisma/client";

import { db } from "../../../lib/db";

const SUPPORT_LEVELS = new Set<SupportLevel>(["LEVEL_1", "LEVEL_2", "LEVEL_3", "UNKNOWN"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supportLevel = searchParams.get("supportLevel");
  const companyId = searchParams.get("companyId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where: Prisma.PriceHistoryWhereInput = {};

  if (supportLevel) {
    if (!SUPPORT_LEVELS.has(supportLevel as SupportLevel)) {
      return NextResponse.json({ ok: false, error: "Invalid supportLevel" }, { status: 400 });
    }

    where.supportLevel = supportLevel as SupportLevel;
  }

  if (companyId) {
    where.companyId = companyId;
  }

  if (from || to) {
    where.scrapedAt = {};

    if (from) {
      where.scrapedAt.gte = new Date(from);
    }

    if (to) {
      where.scrapedAt.lte = new Date(to);
    }
  }

  const prices = await db.priceHistory.findMany({
    where,
    include: {
      company: true,
    },
    orderBy: {
      scrapedAt: "desc",
    },
  });

  // Prisma Decimal is not a plain JS number — convert before JSON serialization
  // to avoid an empty object {} being sent instead of the numeric value.
  const serialized = prices.map((p) => ({
    ...p,
    extractedPrice: Number(p.extractedPrice),
  }));

  return NextResponse.json({ ok: true, prices: serialized });
}
