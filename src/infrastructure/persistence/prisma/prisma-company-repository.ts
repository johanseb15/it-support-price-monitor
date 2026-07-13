import type { PrismaClient } from "@prisma/client";

import type { Company } from "../../../domain/entities/company";
import type { DiscoveredCompany } from "../../../domain/entities/discovered-company";
import type { ICompanyRepository } from "../../../domain/ports/company-repository";
import { mapCompany } from "./mappers";

type CompanyDb = Pick<
  PrismaClient,
  "company"
>;

function companyWhere(company: DiscoveredCompany) {
  if (company.mapsPlaceId) {
    return { mapsPlaceId: company.mapsPlaceId };
  }

  if (company.websiteUrl) {
    return { websiteUrl: company.websiteUrl };
  }

  return null;
}

export class PrismaCompanyRepository implements ICompanyRepository {
  constructor(private readonly db: CompanyDb) {}

  async upsertDiscovered(company: DiscoveredCompany): Promise<Company> {
    const baseData = {
      name: company.name,
      websiteUrl: company.websiteUrl ?? null,
      mapsPlaceId: company.mapsPlaceId ?? null,
      address: company.address ?? null,
      phone: company.phone ?? null,
      city: company.city,
      province: "Cordoba",
      country: "Argentina",
      source: "SERPAPI_GOOGLE_MAPS" as const,
    };
    const where = companyWhere(company);

    if (where) {
      const record = await this.db.company.upsert({
        where,
        update: baseData,
        create: {
          ...baseData,
          isActive: true,
        },
      });
      return mapCompany(record);
    }

    const existing = await this.db.company.findFirst({
      where: {
        name: company.name,
        address: company.address ?? null,
      },
    });

    if (existing) {
      const record = await this.db.company.update({
        where: { id: existing.id },
        data: baseData,
      });
      return mapCompany(record);
    }

    const record = await this.db.company.create({
      data: {
        ...baseData,
        isActive: true,
      },
    });
    return mapCompany(record);
  }

  async findActiveWithWebsite(limit: number): Promise<Company[]> {
    const records = await this.db.company.findMany({
      where: {
        isActive: true,
        websiteUrl: {
          not: null,
        },
      },
      orderBy: {
        lastScrapedAt: "asc",
      },
      take: limit,
    });

    return records.map(mapCompany);
  }

  async markScraped(companyId: string, scrapedAt: Date): Promise<void> {
    await this.db.company.update({
      where: { id: companyId },
      data: { lastScrapedAt: scrapedAt },
    });
  }
}
