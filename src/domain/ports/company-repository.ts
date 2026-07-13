import type { Company } from "../entities/company";
import type { DiscoveredCompany } from "../entities/discovered-company";

export interface ICompanyRepository {
  upsertDiscovered(company: DiscoveredCompany): Promise<Company>;
  findActiveWithWebsite(limit: number): Promise<Company[]>;
  markScraped(companyId: string, scrapedAt: Date): Promise<void>;
}
