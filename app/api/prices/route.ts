import { NextResponse } from "next/server";
import type { SupportLevel } from "@prisma/client";

import { db } from "../../../lib/db";

const SUPPORT_LEVELS = new Set<SupportLevel>(["LEVEL_1", "LEVEL_2", "LEVEL_3", "UNKNOWN"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supportLevel = searchParams.get("supportLevel");
  const companyId = searchParams.get("companyId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where: any = {};

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

  return NextResponse.json({ ok: true, prices });
}
