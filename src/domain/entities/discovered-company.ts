export type DiscoveredCompany = {
  name: string;
  websiteUrl?: string | null;
  mapsPlaceId?: string | null;
  address?: string | null;
  phone?: string | null;
  city: string;
};
