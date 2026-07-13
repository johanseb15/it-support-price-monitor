import type { Company } from "../entities/company";
import type { DiscoveredCompany } from "../entities/discovered-company";

export interface ICompanyRepository {
  /**
   * Insertar o actualizar una empresa descubierta.
   * Valida que la ciudad exista en la BD antes de guardar.
   * 
   * @throws ScraperError con type VALIDATION_ERROR si validación falla
   * @throws ScraperError con type PERSISTENCE_ERROR si la BD falla
   */
  upsertDiscovered(company: DiscoveredCompany): Promise<Company>;

  /**
   * Obtener empresas activas que tienen website URL.
   * Ordenadas por fecha de scraping (antiguos primero para round-robin).
   */
  findActiveWithWebsite(limit: number): Promise<Company[]>;

  /**
   * Marcar empresa como scrapedactualizar lastScrapedAt.
   * 
   * @throws ScraperError con type PERSISTENCE_ERROR si la BD falla
   */
  markScraped(companyId: string, scrapedAt: Date): Promise<void>;
}
