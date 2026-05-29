import { describe, expect, it, vi } from "vitest";

type CompanyRow = {
  id: string;
  name: string;
  websiteUrl: string | null;
  mapsPlaceId: string | null;
  address: string | null;
  phone: string | null;
  city: string;
  province: string;
  country: string;
  source: "SERPAPI_GOOGLE_MAPS";
  isActive: boolean;
  lastScrapedAt: Date | null;
};

type ScrapeRunRow = {
  id: string;
  status: string;
  discoveredCount: number;
  extractedCount: number;
  finishedAt: Date | null;
  errorMessage: string | null;
};

type PriceHistoryRow = {
  id: string;
  companyId: string;
  supportLevel: string;
  serviceName: string;
  extractedPrice: number;
  currency: string;
  rawText: string | null;
  sourceUrl: string | null;
  confidence: number;
};

function createInMemoryRunnerDb() {
  const companies: CompanyRow[] = [];
  const scrapeRuns: ScrapeRunRow[] = [];
  const priceHistories: PriceHistoryRow[] = [];

  return {
    tables: {
      companies,
      scrapeRuns,
      priceHistories,
    },
    dbClient: {
      scrapeRun: {
        create: vi.fn(async ({ data }) => {
          const row = {
            id: `run-${scrapeRuns.length + 1}`,
            finishedAt: null,
            errorMessage: null,
            ...data,
          };
          scrapeRuns.push(row);
          return row;
        }),
        update: vi.fn(async ({ where, data }) => {
          const row = scrapeRuns.find((run) => run.id === where.id);

          if (!row) {
            throw new Error(`ScrapeRun not found: ${where.id}`);
          }

          Object.assign(row, data);
          return row;
        }),
      },
      company: {
        upsert: vi.fn(async ({ where, update, create }) => {
          const row = companies.find((company) => {
            return (
              ("mapsPlaceId" in where && company.mapsPlaceId === where.mapsPlaceId) ||
              ("websiteUrl" in where && company.websiteUrl === where.websiteUrl)
            );
          });

          if (row) {
            Object.assign(row, update);
            return row;
          }

          const created = {
            id: `company-${companies.length + 1}`,
            lastScrapedAt: null,
            ...create,
          };
          companies.push(created);
          return created;
        }),
        findFirst: vi.fn(async ({ where }) => {
          return (
            companies.find(
              (company) => company.name === where.name && company.address === where.address,
            ) ?? null
          );
        }),
        create: vi.fn(async ({ data }) => {
          const row = {
            id: `company-${companies.length + 1}`,
            lastScrapedAt: null,
            ...data,
          };
          companies.push(row);
          return row;
        }),
        update: vi.fn(async ({ where, data }) => {
          const row = companies.find((company) => company.id === where.id);

          if (!row) {
            throw new Error(`Company not found: ${where.id}`);
          }

          Object.assign(row, data);
          return row;
        }),
        findMany: vi.fn(async ({ take }) => {
          return companies
            .filter((company) => company.isActive && company.websiteUrl !== null)
            .slice(0, take);
        }),
      },
      priceHistory: {
        create: vi.fn(async ({ data }) => {
          const row = {
            id: `price-${priceHistories.length + 1}`,
            ...data,
          };
          priceHistories.push(row);
          return row;
        }),
      },
    },
  };
}

describe("runCompleteScrapingPipeline", () => {
  it("creates ScrapeRun, upserts Companies and inserts immutable PriceHistory rows", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/test");
    vi.stubEnv("SERP_API_KEY", "test-key");
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SCRAPER_MAX_COMPANIES_PER_RUN", "25");

    const { runCompleteScrapingPipeline } = await import(
      "../../src/services/scraper/runner"
    );
    const { dbClient, tables } = createInMemoryRunnerDb();

    const result = await runCompleteScrapingPipeline({
      dbClient: dbClient as never,
      maxCompaniesPerRun: 25,
      discoverCompanies: async () => [
        {
          name: "Cordoba IT Soporte",
          websiteUrl: "https://cordobait.example.com",
          mapsPlaceId: "place-1",
          address: "Av. Colon 123",
          phone: "3511111111",
          city: "Cordoba",
        },
      ],
      extractPrices: async () => [
        {
          title: "Mantenimiento PC",
          text: "Formateo e instalacion Windows desde $ 15.000",
          priceRaw: "$ 15.000",
          sourceUrl: "https://cordobait.example.com",
        },
      ],
      normalizeService: async () => ({
        isValid: true,
        supportLevel: "LEVEL_1",
        serviceName: "Formateo e instalacion Windows",
        price: 15000,
        confidence: 0.9,
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      status: "SUCCESS",
      discoveredCount: 1,
      extractedCount: 1,
      errorCount: 0,
    });
    expect(tables.scrapeRuns).toHaveLength(1);
    expect(tables.scrapeRuns[0]).toMatchObject({
      status: "SUCCESS",
      discoveredCount: 1,
      extractedCount: 1,
    });
    expect(tables.scrapeRuns[0].finishedAt).toBeInstanceOf(Date);
    expect(tables.companies).toHaveLength(1);
    expect(tables.companies[0]).toMatchObject({
      name: "Cordoba IT Soporte",
      isActive: true,
      mapsPlaceId: "place-1",
    });
    expect(tables.priceHistories).toHaveLength(1);
    expect(tables.priceHistories[0]).toMatchObject({
      companyId: "company-1",
      supportLevel: "LEVEL_1",
      serviceName: "Formateo e instalacion Windows",
      extractedPrice: 15000,
      currency: "ARS",
    });
  });
});
