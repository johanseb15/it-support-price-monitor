import type { Company } from "../../domain/entities/company";
import type { DiscoveredCompany } from "../../domain/entities/discovered-company";
import type { ICompanyRepository } from "../../domain/ports/company-repository";
import type { ICompanyDiscoveryService } from "../../domain/ports/company-discovery-service";

export type DiscoverCompaniesDependencies = {
  companyDiscovery: ICompanyDiscoveryService;
  companyRepository: ICompanyRepository;
};

export class DiscoverCompanies {
  constructor(private readonly dependencies: DiscoverCompaniesDependencies) {}

  async execute(): Promise<{ companies: DiscoveredCompany[]; errorMessage?: string }> {
    try {
      const companies = await this.dependencies.companyDiscovery.discover();

      for (const company of companies) {
        await this.dependencies.companyRepository.upsertDiscovered(company);
      }

      return { companies };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        "[scraper] Discovery step failed, proceeding with existing active companies:",
        error,
      );
      return { companies: [], errorMessage: message };
    }
  }
}

export type DiscoverCompaniesResult = Awaited<ReturnType<DiscoverCompanies["execute"]>>;

export type { Company, DiscoveredCompany };
