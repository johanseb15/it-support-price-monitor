/**
 * Configuración externalizada de queries de descubrimiento.
 * Permite cambiar sin tocar código.
 */

export interface DiscoveryQuerySet {
  region: string;
  city: string;
  queries: string[];
}

/**
 * Queries de descubrimiento por región/ciudad.
 * Formato: Array de frases que se envían a SerpApi.
 */
export const DISCOVERY_QUERIES: Record<string, DiscoveryQuerySet> = {
  // Córdoba, Argentina
  'cordoba-capital': {
    region: 'Córdoba',
    city: 'Córdoba Capital',
    queries: [
      'soporte tecnico pc cordoba capital',
      'servicio tecnico computadoras cordoba',
      'mantenimiento informatico empresas cordoba',
      'soporte servidores redes cordoba',
      'recuperacion datos ssd cordoba',
      'outsourcing soporte tecnico IT cordoba',
      'reparacion computadoras cordoba',
      'instalacion windows office cordoba',
      'diagnostico pc lento cordoba',
      'virus malware eliminacion cordoba',
    ],
  },

  // Buenos Aires
  'buenos-aires': {
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    queries: [
      'soporte tecnico IT buenos aires',
      'servicio tecnico computadoras buenos aires',
      'mantenimiento redes empresas buenos aires',
      'data center soporte buenos aires',
      'consultoria informatica buenos aires',
      'ciberseguridad buenos aires',
    ],
  },

  // Mendoza
  'mendoza': {
    region: 'Mendoza',
    city: 'Mendoza',
    queries: [
      'soporte tecnico IT mendoza',
      'servicio tecnico computadoras mendoza',
      'mantenimiento informatico mendoza',
      'reparacion pc mendoza',
    ],
  },
};

/**
 * Obtener queries para una región específica.
 * Fallback a queries genéricas si no existe la región.
 */
export function getDiscoveryQueries(regionCityKey: string): DiscoveryQuerySet | null {
  return DISCOVERY_QUERIES[regionCityKey.toLowerCase()] ?? null;
}

/**
 * Listar todas las regiones/ciudades disponibles.
 */
export function getAvailableRegions(): string[] {
  return Object.keys(DISCOVERY_QUERIES);
}
