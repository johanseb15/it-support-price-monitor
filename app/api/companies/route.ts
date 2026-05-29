import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { db } from "../../../lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const active = searchParams.get("active");
  const q = searchParams.get("q");
  const where: Prisma.CompanyWhereInput = {};

  if (city) {
    where.city = city;
  }

  if (active === "true" || active === "false") {
    where.isActive = active === "true";
  }

  if (q) {
    where.name = {
      contains: q,
      mode: "insensitive",
    };
  }

  const companies = await db.company.findMany({
    where,
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({ ok: true, companies });
}
