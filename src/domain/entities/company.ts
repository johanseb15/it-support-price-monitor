import type { DiscoverySource } from "../value-objects/discovery-source";

export type Company = {
  id: string;
  name: string;
  websiteUrl: string | null;
  mapsPlaceId: string | null;
  address: string | null;
  phone: string | null;
  city: string;
  province: string;
  country: string;
  source: DiscoverySource;
  isActive: boolean;
  lastScrapedAt: Date | null;
};
