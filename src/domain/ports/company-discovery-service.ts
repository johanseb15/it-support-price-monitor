import type { DiscoveredCompany } from "../entities/discovered-company";

export interface ICompanyDiscoveryService {
  discover(): Promise<DiscoveredCompany[]>;
}
