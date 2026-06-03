import type { SupportLevel } from "@prisma/client";

import { db } from "../../../lib/db";

const SUPPORT_LEVELS: Exclude<SupportLevel, "UNKNOWN">[] = ["LEVEL_1", "LEVEL_2", "LEVEL_3"];

export type DashboardKpis = {
  activeCompanies: number;
  pricesLast30Days: number;
  averageByLevel: Record<Exclude<SupportLevel, "UNKNOWN">, number | null>;
};

export type RecentPriceRow = {
  id: string;
  companyName: string;
  serviceName: string;
  supportLevel: SupportLevel;
  price: number;
  currency: string;
  scrapedAt: string;
};

export type TrendPoint = {
  period: string;
  LEVEL_1: number | null;
  LEVEL_2: number | null;
  LEVEL_3: number | null;
};

export type CompanyListRow = {
  id: string;
  name: string;
  websiteUrl: string | null;
  address: string | null;
  phone: string | null;
  city: string;
  source: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  createdAt: string;
};

export type PriceListRow = RecentPriceRow & {
  rawText: string | null;
  sourceUrl: string | null;
  confidence: number;
};

type TrendQueryRow = {
  period: Date;
  supportLevel: Exclude<SupportLevel, "UNKNOWN">;
  averagePrice: unknown;
};

type DecimalLike = {
  toNumber: () => number;
};

function isDecimalLike(value: unknown): value is DecimalLike {
  return (
    value !== null &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  );
}

function safeToNumber(value: unknown, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;

  try {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : defaultValue;
    }

    if (typeof value === "string") {
      const n = Number(value);
      return Number.isFinite(n) ? n : defaultValue;
    }

    if (isDecimalLike(value)) {
      const n = value.toNumber();
      return Number.isFinite(n) ? n : defaultValue;
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : defaultValue;
  } catch {
    return defaultValue;
  }
}

function serializeDate(value: Date): string {
  return value.toISOString();
}

async function safeDbCall<T>(callback: () => Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await callback();
  } catch (error) {
    console.error(`${context} failed, returning safe fallback:`, error);
    return fallback;
  }
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  try {
    const [activeCompanies, pricesLast30Days, averages] = await Promise.all([
      db.company.count({ where: { isActive: true } }),
      db.priceHistory.count({ where: { scrapedAt: { gte: since } } }),
      db.priceHistory.groupBy({
        by: ["supportLevel"],
        where: {
          supportLevel: {
            in: SUPPORT_LEVELS,
          },
        },
        _avg: {
          extractedPrice: true,
        },
      }),
    ]);

    const averageByLevel = SUPPORT_LEVELS.reduce<DashboardKpis["averageByLevel"]>(
      (accumulator, level) => {
        const match = averages.find((average) => average.supportLevel === level);
        accumulator[level] = match?._avg.extractedPrice
          ? safeToNumber(match._avg.extractedPrice, 0)
          : 0;
        return accumulator;
      },
      {
        LEVEL_1: 0,
        LEVEL_2: 0,
        LEVEL_3: 0,
      },
    );

    return {
      activeCompanies,
      pricesLast30Days,
      averageByLevel,
    };
  } catch (error) {
    console.error("getDashboardKpis failed, returning safe defaults:", error);
    return {
      activeCompanies: 0,
      pricesLast30Days: 0,
      averageByLevel: {
        LEVEL_1: 0,
        LEVEL_2: 0,
        LEVEL_3: 0,
      },
    };
  }
}

export async function getRecentPrices(limit = 10): Promise<RecentPriceRow[]> {
  const prices = await safeDbCall(
    () =>
      db.priceHistory.findMany({
        take: limit,
        include: {
          company: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          scrapedAt: "desc",
        },
      }),
    [],
    "getRecentPrices",
  );

  return prices.map((price) => ({
    id: price.id,
    companyName: price.company.name,
    serviceName: price.serviceName,
    supportLevel: price.supportLevel,
    price: safeToNumber(price.extractedPrice, 0),
    currency: price.currency,
    scrapedAt: serializeDate(price.scrapedAt),
  }));
}

export type LastScrapeRun = {
  id: string;
  status: string;
  discoveredCount: number;
  extractedCount: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export async function getPriceTrend(): Promise<TrendPoint[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  let rows: TrendQueryRow[] = [];
  try {
    rows = await db.$queryRaw<TrendQueryRow[]>`
      SELECT
        date_trunc('week', "scrapedAt") AS "period",
        "supportLevel",
        AVG("extractedPrice") AS "averagePrice"
      FROM "PriceHistory"
      WHERE "scrapedAt" >= ${since}
        AND "supportLevel" IN ('LEVEL_1', 'LEVEL_2', 'LEVEL_3')
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `;
  } catch (error) {
    console.error("getPriceTrend query failed, returning empty trend:", error);
    return [];
  }

  const points = new Map<string, TrendPoint>();

  for (const row of rows) {
    const period = row.period.toISOString().slice(0, 10);
    const point =
      points.get(period) ??
      ({
        period,
        LEVEL_1: null,
        LEVEL_2: null,
        LEVEL_3: null,
      } satisfies TrendPoint);

    // Ensure numeric value (0 when missing) to avoid NaN in charts
    point[row.supportLevel] = safeToNumber(row.averagePrice, 0);
    points.set(period, point);
  }

  return [...points.values()];
}

export async function getLastScrapeRun(): Promise<LastScrapeRun | null> {
  const scrapeRun = await safeDbCall(
    () =>
      db.scrapeRun.findFirst({
        orderBy: { startedAt: "desc" },
      }),
    null,
    "getLastScrapeRun",
  );

  if (!scrapeRun) {
    return null;
  }

  return {
    id: scrapeRun.id,
    status: scrapeRun.status,
    discoveredCount: scrapeRun.discoveredCount,
    extractedCount: scrapeRun.extractedCount,
    errorMessage: scrapeRun.errorMessage,
    startedAt: serializeDate(scrapeRun.startedAt),
    finishedAt: scrapeRun.finishedAt ? serializeDate(scrapeRun.finishedAt) : null,
  };
}

export async function getCompanies(params: {
  q?: string;
  active?: string;
}): Promise<CompanyListRow[]> {
  const companies = await safeDbCall(
    () =>
      db.company.findMany({
        where: {
          ...(params.q
            ? {
                name: {
                  contains: params.q,
                  mode: "insensitive",
                },
              }
            : {}),
          ...(params.active === "true" || params.active === "false"
            ? { isActive: params.active === "true" }
            : {}),
        },
        orderBy: {
          name: "asc",
        },
      }),
    [],
    "getCompanies",
  );

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    websiteUrl: company.websiteUrl,
    address: company.address,
    phone: company.phone,
    city: company.city,
    source: company.source,
    isActive: company.isActive,
    lastScrapedAt: company.lastScrapedAt ? serializeDate(company.lastScrapedAt) : null,
    createdAt: serializeDate(company.createdAt),
  }));
}

export async function getPriceHistory(params: {
  supportLevel?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: PriceListRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  const where = {
    ...(params.supportLevel && params.supportLevel !== "ALL"
      ? { supportLevel: params.supportLevel as SupportLevel }
      : {}),
    ...(params.from || params.to
      ? {
          scrapedAt: {
            ...(params.from ? { gte: new Date(params.from) } : {}),
            ...(params.to ? { lte: new Date(params.to) } : {}),
          },
        }
      : {}),
  };

  const [total, prices] = await safeDbCall(
    async () =>
      Promise.all([
        db.priceHistory.count({ where }),
        db.priceHistory.findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            company: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            scrapedAt: "desc",
          },
        }),
      ]),
    [0, []] as const,
    "getPriceHistory",
  );

  return {
    total,
    page,
    pageSize,
    rows: prices.map((price) => ({
      id: price.id,
      companyName: price.company.name,
      serviceName: price.serviceName,
      supportLevel: price.supportLevel,
      price: safeToNumber(price.extractedPrice, 0),
      currency: price.currency,
      scrapedAt: serializeDate(price.scrapedAt),
      rawText: price.rawText,
      sourceUrl: price.sourceUrl,
      confidence: price.confidence,
    })),
  };
}
