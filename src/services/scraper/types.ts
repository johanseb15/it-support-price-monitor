import type { SupportLevel } from "@prisma/client";

export type DiscoveredCompany = {
  name: string;
  websiteUrl?: string | null;
  mapsPlaceId?: string | null;
  address?: string | null;
  phone?: string | null;
  city: string;
};

export type ScrapedServiceRaw = {
  title: string;
  text: string;
  priceRaw: string;
  sourceUrl: string;
};

export type NormalizedService = {
  isValid: boolean;
  supportLevel: SupportLevel;
  serviceName: string;
  price: number | null;
  confidence: number;
};
