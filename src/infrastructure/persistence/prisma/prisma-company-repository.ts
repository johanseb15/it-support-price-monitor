import type { PrismaClient } from "@prisma/client";

import type { Company } from "../../../domain/entities/company";
import type { DiscoveredCompany } from "../../../domain/entities/discovered-company";
import type { ICompanyRepository } from "../../../domain/ports/company-repository";
import { ScraperError } from "../../../domain/errors/scraper-error";
import { getLogger } from "../../logging/logger";
import { mapCompany } from "./mappers";

type CompanyDb = Pick<PrismaClient, "company">;

const logger = getLogger();

function companyWhere(company: DiscoveredCompany) {
  if (company.mapsPlaceId) {
    return { mapsPlaceId: company.mapsPlaceId };
  }

  if (company.websiteUrl) {
    return { websiteUrl: company.websiteUrl };
  }

  return null;
}

/**
 * Validar que los datos de la empresa sean válidos antes de guardar.
 */
function validateCompanyData(company: DiscoveredCompany): void {
  if (!company.name || company.name.trim().length === 0) {
    throw new ScraperError('VALIDATION_ERROR', 'Company name cannot be empty', {
      context: { company },
    });
  }

  if (company.name.length > 255) {
    throw new ScraperError('VALIDATION_ERROR', 'Company name is too long (max 255 chars)', {
      context: { company },
    });
  }

  // Validar que al menos tenga un identificador único
  if (!company.mapsPlaceId && !company.websiteUrl && !company.address) {
    throw new ScraperError(
      'VALIDATION_ERROR',
      'Company must have at least one identifier (mapsPlaceId, websiteUrl, or address)',
      {
        context: { company },
        recoverable: false,
      }
    );
  }
}

export class PrismaCompanyRepository implements ICompanyRepository {
  constructor(private readonly db: CompanyDb) {}

  async upsertDiscovered(company: DiscoveredCompany): Promise<Company> {
    try {
      // Validar datos de entrada
      validateCompanyData(company);

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
        logger.debug('Upserting company by identifier', {
          company: company.name,
          where,
        });

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

      // Fallback: buscar por nombre + dirección
      const existing = await this.db.company.findFirst({
        where: {
          name: company.name,
          address: company.address ?? null,
        },
      });

      if (existing) {
        logger.debug('Found existing company by name+address', {
          company: company.name,
          id: existing.id,
        });

        const record = await this.db.company.update({
          where: { id: existing.id },
          data: baseData,
        });
        return mapCompany(record);
      }

      // Crear nueva empresa
      logger.debug('Creating new company', {
        company: company.name,
      });

      const record = await this.db.company.create({
        data: {
          ...baseData,
          isActive: true,
        },
      });
      return mapCompany(record);
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to upsert company', error, {
        company: company.name,
      });

      throw new ScraperError('PERSISTENCE_ERROR', `Failed to upsert company: ${message}`, {
        cause: error,
        context: { company: company.name },
        recoverable: true,
      });
    }
  }

  async findActiveWithWebsite(limit: number): Promise<Company[]> {
    try {
      if (limit <= 0) {
        throw new ScraperError('VALIDATION_ERROR', 'Limit must be greater than 0', {
          context: { limit },
          recoverable: false,
        });
      }

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

      logger.debug('Found active companies with website', {
        count: records.length,
        limit,
      });

      return records.map(mapCompany);
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find active companies', error);

      throw new ScraperError(
        'PERSISTENCE_ERROR',
        `Failed to find active companies: ${message}`,
        {
          cause: error,
          recoverable: true,
        }
      );
    }
  }

  async markScraped(companyId: string, scrapedAt: Date): Promise<void> {
    try {
      if (!companyId || companyId.trim().length === 0) {
        throw new ScraperError('VALIDATION_ERROR', 'Company ID cannot be empty', {
          context: { companyId },
          recoverable: false,
        });
      }

      logger.debug('Marking company as scraped', {
        companyId,
        scrapedAt: scrapedAt.toISOString(),
      });

      await this.db.company.update({
        where: { id: companyId },
        data: { lastScrapedAt: scrapedAt },
      });
    } catch (error) {
      if (error instanceof ScraperError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to mark company as scraped', error, { companyId });

      throw new ScraperError(
        'PERSISTENCE_ERROR',
        `Failed to mark company as scraped: ${message}`,
        {
          cause: error,
          context: { companyId },
          recoverable: true,
        }
      );
    }
  }
}
