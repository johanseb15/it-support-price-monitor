import { beforeEach, describe, expect, it, vi } from "vitest";

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
              ("mapsPlaceId" in where && where.mapsPlaceId !== null && company.mapsPlaceId === where.mapsPlaceId) ||
              ("websiteUrl" in where && where.websiteUrl !== null && company.websiteUrl === where.websiteUrl)
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("google-discovery and scraping runner integration", () => {
  it("handles mixed SerpApi responses and continues processing", async () => {
    vi.stubEnv("SERP_API_KEY", "test-key");
    vi.stubEnv("SERP_PROVIDER", "serpapi");
    vi.stubEnv("SCRAPER_TARGET_CITY", "Cordoba,Cordoba Province,Argentina");
    vi.stubEnv("NODE_ENV", "production");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const query = url.searchParams.get("q") ?? "";

      if (query.includes("soporte tecnico pc cordoba capital")) {
        return jsonResponse({
          local_results: [
            {
              title: "Cordoba IT Soporte",
              website: "https://cordobait.example.com",
              place_id: "place-1",
              address: "Av. Colon 123",
              phone: "3511111111",
            },
          ],
        });
      }

      if (query.includes("servicio tecnico computadoras cordoba")) {
        return jsonResponse({ local_results: [] });
      }

      return jsonResponse({ error: "Quota exceeded" }, 429);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { discoverCompaniesFromMaps } = await import(
      "../../src/services/scraper/google-discovery",
    );

    const companies = await discoverCompaniesFromMaps();

    expect(companies).toEqual([
      expect.objectContaining({
        name: "Cordoba IT Soporte",
        websiteUrl: "https://cordobait.example.com",
        mapsPlaceId: "place-1",
      }),
    ]);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws when SerpApi returns quota errors for every query", async () => {
    vi.stubEnv("SERP_API_KEY", "test-key");
    vi.stubEnv("SERP_PROVIDER", "serpapi");
    vi.stubEnv("SCRAPER_TARGET_CITY", "Cordoba,Cordoba Province,Argentina");
    vi.stubEnv("NODE_ENV", "production");

    const fetchMock = vi.fn(async () => jsonResponse({ error: "Quota exceeded" }, 429));
    vi.stubGlobal("fetch", fetchMock);

    const { discoverCompaniesFromMaps } = await import(
      "../../src/services/scraper/google-discovery",
    );

    await expect(discoverCompaniesFromMaps()).rejects.toThrow(
      /SerpApi discovery failed for every query/i,
    );
    expect(fetchMock).toHaveBeenCalled();
  });

  it("creates scrape run, upserts companies and inserts only new PriceHistory rows with partial failures", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/test");
    vi.stubEnv("SERP_API_KEY", "test-key");
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SCRAPER_MAX_COMPANIES_PER_RUN", "25");

    const { runCompleteScrapingPipeline } = await import(
      "../../src/services/scraper/runner",
    );

    const { dbClient, tables } = createInMemoryRunnerDb();

    const result = await runCompleteScrapingPipeline({
      dbClient: dbClient as never,
      maxCompaniesPerRun: 2,
      discoverCompanies: async () => [
        {
          name: "Empresa Uno",
          websiteUrl: "https://empresa-uno.example.com",
          mapsPlaceId: "place-1",
          address: "Av. Primera 1",
          phone: "3511111111",
          city: "Cordoba",
        },
        {
          name: "Empresa Dos",
          websiteUrl: "https://empresa-dos-timeout.example.com",
          mapsPlaceId: "place-2",
          address: "Av. Segunda 2",
          phone: "3512222222",
          city: "Cordoba",
        },
      ],
      extractPrices: async (url: string) => {
        if (url.includes("timeout")) {
          throw new Error("Timeout while loading target");
        }

        return [
          {
            title: "Mantenimiento PC",
            text: "Formateo e instalacion Windows desde $ 15.000",
            priceRaw: "$ 15.000",
            sourceUrl: "https://empresa-uno.example.com",
          },
        ];
      },
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
      status: "PARTIAL",
      discoveredCount: 2,
      extractedCount: 1,
      errorCount: 1,
    });

    expect(tables.scrapeRuns).toHaveLength(1);
    expect(tables.scrapeRuns[0]).toMatchObject({
      status: "PARTIAL",
      discoveredCount: 2,
      extractedCount: 1,
    });
    expect(tables.scrapeRuns[0].errorMessage).toContain("Timeout while loading target");

    expect(tables.companies).toHaveLength(2);
    expect(tables.priceHistories).toHaveLength(1);
    expect(tables.priceHistories[0]).toMatchObject({
      companyId: "company-1",
      supportLevel: "LEVEL_1",
      extractedPrice: 15000,
      currency: "ARS",
    });
  });
});
