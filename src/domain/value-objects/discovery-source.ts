export const DiscoverySource = {
  SERPAPI_GOOGLE_MAPS: "SERPAPI_GOOGLE_MAPS",
  SERPAPI_GOOGLE_SEARCH: "SERPAPI_GOOGLE_SEARCH",
  MANUAL: "MANUAL",
} as const;

export type DiscoverySource = (typeof DiscoverySource)[keyof typeof DiscoverySource];
