import type { Company as PrismaCompany } from "@prisma/client";

import type { Company } from "../../../domain/entities/company";
import type { DiscoverySource } from "../../../domain/value-objects/discovery-source";

export function mapCompany(record: PrismaCompany): Company {
  return {
    id: record.id,
    name: record.name,
    websiteUrl: record.websiteUrl,
    mapsPlaceId: record.mapsPlaceId,
    address: record.address,
    phone: record.phone,
    city: record.city,
    province: record.province,
    country: record.country,
    source: record.source as DiscoverySource,
    isActive: record.isActive,
    lastScrapedAt: record.lastScrapedAt,
  };
}
