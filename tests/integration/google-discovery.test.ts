import { afterEach, describe, expect, it, vi } from "vitest";

import {
  discoverCompaniesFromMaps,
  mapAndDedupeSerpApiResponses,
} from "../../src/services/scraper/google-discovery";

const serpApiMockResponses = [
  {
    local_results: [
      {
        title: "Cordoba IT Soporte",
        place_id: "place-1",
        website: "https://cordobait.example.com/?utm_source=google",
        address: "Av. Colon 123, Cordoba",
        phone: "+54 351 111-1111",
      },
      {
        title: "Redes Centro",
        place_id: "place-2",
        website: "https://redes-centro.example.com",
        address: "San Martin 500, Cordoba",
        phone: "+54 351 222-2222",
      },
    ],
  },
  {
    local_results: [
      {
        title: "Cordoba IT Soporte",
        place_id: "place-1",
        website: "https://cordobait.example.com",
        address: "Av. Colon 123, Cordoba",
      },
      {
        title: "Redes Centro",
        website: "https://redes-centro.example.com/",
        address: "San Martin 500, Cordoba",
      },
      {
        title: "Datos Criticos",
        address: "Buenos Aires 900, Cordoba",
        phone: "+54 351 333-3333",
      },
      {
        title: "Datos Criticos",
        address: "Buenos Aires 900, Cordoba",
      },
    ],
  },
];

describe("google discovery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps and deduplicates SerpApi local_results", () => {
    const companies = mapAndDedupeSerpApiResponses(serpApiMockResponses);

    expect(companies).toHaveLength(3);
    expect(companies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Cordoba IT Soporte",
          mapsPlaceId: "place-1",
          websiteUrl: "https://cordobait.example.com",
          city: "Cordoba",
        }),
        expect.objectContaining({
          name: "Redes Centro",
          mapsPlaceId: "place-2",
          websiteUrl: "https://redes-centro.example.com",
        }),
        expect.objectContaining({
          name: "Datos Criticos",
          address: "Buenos Aires 900, Cordoba",
        }),
      ]),
    );
  });

  it("uses mock mode in test without calling SerpApi", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SERP_API_KEY", "test-key");
    vi.stubEnv("SERP_PROVIDER", "serpapi");
    vi.stubEnv("SERPAPI_MOCK_RESPONSE_JSON", JSON.stringify(serpApiMockResponses));

    const companies = await discoverCompaniesFromMaps();

    expect(companies).toHaveLength(3);
  });

  it("throws a clear error when SERP_API_KEY is missing outside test mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SERP_API_KEY", "");
    vi.stubEnv("SERP_PROVIDER", "serpapi");

    await expect(discoverCompaniesFromMaps()).rejects.toThrow(
      "Invalid discovery environment: SERP_API_KEY or SERPAPI_API_KEY is required",
    );
  });
});
