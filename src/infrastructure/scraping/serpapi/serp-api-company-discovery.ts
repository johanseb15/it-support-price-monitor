import { z } from "zod";

import type { DiscoveredCompany } from "../../../domain/entities/discovered-company";
import type { ICompanyDiscoveryService } from "../../../domain/ports/company-discovery-service";

export const DEFAULT_DISCOVERY_QUERIES = [
  "soporte tecnico pc cordoba capital",
  "servicio tecnico computadoras cordoba",
  "mantenimiento informatico empresas cordoba",
  "soporte servidores redes cordoba",
  "recuperacion datos ssd cordoba",
  "outsourcing soporte tecnico IT cordoba",
];

const discoveryEnvSchema = z.object({
  SERP_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  SERP_PROVIDER: z.enum(["serpapi", "brightdata"]).default("serpapi"),
  SCRAPER_TARGET_CITY: z.string().min(1).default("Cordoba,Cordoba Province,Argentina"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const serpApiLocalResultSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  place_id: z.string().optional(),
  placeId: z.string().optional(),
  data_id: z.string().optional(),
  website: z.string().url().optional(),
  links: z
    .object({
      website: z.string().url().optional(),
    })
    .optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const serpApiResponseSchema = z.object({
  local_results: z.array(serpApiLocalResultSchema).default([]),
});

type SerpApiResponse = z.infer<typeof serpApiResponseSchema>;

function readDiscoveryEnv() {
  const result = discoveryEnvSchema.safeParse(process.env);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid discovery environment: ${message}`);
  }

  const apiKey = (result.data.SERP_API_KEY ?? result.data.SERPAPI_API_KEY)?.trim();

  if (!apiKey) {
    throw new Error("Invalid discovery environment: SERP_API_KEY or SERPAPI_API_KEY is required");
  }

  if (/^(tu_clave|your[_-]?key|change[_-]?me|placeholder)/i.test(apiKey)) {
    throw new Error("Invalid discovery environment: SERP_API_KEY contains a placeholder value");
  }

  if (result.data.SERP_PROVIDER !== "serpapi") {
    throw new Error(`Unsupported SERP provider: ${result.data.SERP_PROVIDER}`);
  }

  return {
    ...result.data,
    SERP_API_KEY: apiKey,
  };
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function normalizeWebsite(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return null;
  }
}

function mapLocalResult(result: z.infer<typeof serpApiLocalResultSchema>): DiscoveredCompany | null {
  const name = normalizeText(result.title ?? result.name);

  if (!name) {
    return null;
  }

  return {
    name,
    websiteUrl: normalizeWebsite(result.website ?? result.links?.website),
    mapsPlaceId: normalizeText(result.place_id ?? result.placeId ?? result.data_id),
    address: normalizeText(result.address),
    phone: normalizeText(result.phone),
    city: "Cordoba",
  };
}

function dedupeKeys(company: DiscoveredCompany): string[] {
  const keys: string[] = [];

  if (company.mapsPlaceId) {
    keys.push(`place:${company.mapsPlaceId.toLowerCase()}`);
  }

  if (company.websiteUrl) {
    keys.push(`website:${company.websiteUrl.toLowerCase()}`);
  }

  if (company.address) {
    keys.push(`name-address:${company.name.toLowerCase()}|${company.address.toLowerCase()}`);
  }

  return keys.length > 0 ? keys : [`name:${company.name.toLowerCase()}`];
}

function dedupeCompanies(companies: DiscoveredCompany[]): DiscoveredCompany[] {
  const companiesById = new Map<number, DiscoveredCompany>();
  const idByKey = new Map<string, number>();
  let nextId = 1;

  for (const company of companies) {
    const keys = dedupeKeys(company);
    const existingId = keys.map((key) => idByKey.get(key)).find((id) => id !== undefined);

    if (!existingId) {
      const id = nextId;
      nextId += 1;
      companiesById.set(id, company);
      keys.forEach((key) => idByKey.set(key, id));
      continue;
    }

    const existing = companiesById.get(existingId);
    companiesById.set(existingId, {
      ...company,
      ...existing,
      websiteUrl: existing?.websiteUrl ?? company.websiteUrl,
      mapsPlaceId: existing?.mapsPlaceId ?? company.mapsPlaceId,
      address: existing?.address ?? company.address,
      phone: existing?.phone ?? company.phone,
    });
    keys.forEach((key) => idByKey.set(key, existingId));
  }

  return [...companiesById.values()];
}

export function mapAndDedupeSerpApiResponses(responses: SerpApiResponse[]): DiscoveredCompany[] {
  const companies = responses.flatMap((response) => {
    const parsed = serpApiResponseSchema.parse(response);
    return parsed.local_results
      .map((result) => mapLocalResult(result))
      .filter((company): company is DiscoveredCompany => company !== null);
  });

  return dedupeCompanies(companies);
}

function readMockResponses(): SerpApiResponse[] {
  const rawMock = process.env.SERPAPI_MOCK_RESPONSE_JSON;

  if (!rawMock) {
    return [];
  }

  const parsed = JSON.parse(rawMock);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function fetchSerpApiLocalResults(
  query: string,
  apiKey: string,
  location: string,
): Promise<SerpApiResponse> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_local");
  url.searchParams.set("q", query);
  url.searchParams.set("location", location);
  url.searchParams.set("google_domain", "google.com.ar");
  url.searchParams.set("gl", "ar");
  url.searchParams.set("hl", "es");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(`SerpApi rejected the configured API key while searching "${query}"`);
    }

    throw new Error(`SerpApi request failed for "${query}" with status ${response.status}`);
  }

  return serpApiResponseSchema.parse(await response.json());
}

export class SerpApiCompanyDiscoveryService implements ICompanyDiscoveryService {
  async discover(): Promise<DiscoveredCompany[]> {
    const discoveryEnv = readDiscoveryEnv();

    if (discoveryEnv.NODE_ENV === "test") {
      return mapAndDedupeSerpApiResponses(readMockResponses());
    }

    const results = await Promise.allSettled(
      DEFAULT_DISCOVERY_QUERIES.map((query) =>
        fetchSerpApiLocalResults(query, discoveryEnv.SERP_API_KEY, discoveryEnv.SCRAPER_TARGET_CITY),
      ),
    );
    const responses: SerpApiResponse[] = [];
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        responses.push(result.value);
      } else {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }

    if (responses.length === 0) {
      throw new Error(`SerpApi discovery failed for every query: ${errors.join(" | ")}`);
    }

    if (errors.length > 0) {
      console.error(`SerpApi discovery had ${errors.length} failed queries`, errors);
    }

    return mapAndDedupeSerpApiResponses(responses);
  }
}

export async function discoverCompaniesFromMaps(): Promise<DiscoveredCompany[]> {
  return new SerpApiCompanyDiscoveryService().discover();
}
