/**
 * Configuración de palabras clave para normalización de precios.
 * Externalizada para permitir ajustes sin recompilación.
 */

import type { SupportLevel } from '../../domain/value-objects/support-level';

export interface KeywordWeight {
  pattern: RegExp;
  weight: number;
  description: string;
}

/**
 * Keywords por nivel de soporte.
 * Formato: patrón regex → peso (más alto = más confianza en nivel).
 */
export const PRICE_KEYWORDS: Record<Exclude<SupportLevel, 'UNKNOWN'>, KeywordWeight[]> = {
  LEVEL_1: [
    // Operaciones básicas de PC
    {
      pattern: /\bformateo\b/i,
      weight: 3,
      description: 'Formateo de disco',
    },
    {
      pattern: /\blimpieza\b/i,
      weight: 2,
      description: 'Limpieza de PC',
    },
    {
      pattern: /\binstalaci[oó]n\s+(?:de\s+)?windows\b/i,
      weight: 3,
      description: 'Instalación de Windows',
    },
    {
      pattern: /\binstalaci[oó]n\s+(?:de\s+)?office\b/i,
      weight: 3,
      description: 'Instalación de Office',
    },
    {
      pattern: /\bbackup\s+simple\b/i,
      weight: 2,
      description: 'Backup simple',
    },
    {
      pattern: /\bmantenimiento\s+(?:de\s+)?pc\b/i,
      weight: 3,
      description: 'Mantenimiento de PC',
    },
    {
      pattern: /\bantivirus\b/i,
      weight: 2,
      description: 'Antivirus',
    },
    {
      pattern: /\bvirus\b|\bmalware\b/i,
      weight: 2,
      description: 'Eliminación de virus/malware',
    },
  ],

  LEVEL_2: [
    // Infraestructura de red
    {
      pattern: /\bred(?:es)?\b/i,
      weight: 3,
      description: 'Redes',
    },
    {
      pattern: /\brouters?\b/i,
      weight: 2,
      description: 'Routers',
    },
    {
      pattern: /\bservidores?\s+b[aá]sicos?\b/i,
      weight: 3,
      description: 'Servidores básicos',
    },
    {
      pattern: /\bimpresoras?\s+de\s+red\b/i,
      weight: 2,
      description: 'Impresoras de red',
    },
    {
      pattern: /\boutlook\s+corporativo\b/i,
      weight: 3,
      description: 'Outlook corporativo',
    },
    {
      pattern: /\bdominios?\b/i,
      weight: 2,
      description: 'Dominios',
    },
    {
      pattern: /\bactive\s+directory\s+b[aá]sico\b/i,
      weight: 3,
      description: 'Active Directory básico',
    },
    {
      pattern: /\bsoporte\s+(?:para\s+)?empresas\b/i,
      weight: 2,
      description: 'Soporte para empresas',
    },
    {
      pattern: /\bmantenimiento\s+(?:de\s+)?red\b/i,
      weight: 2,
      description: 'Mantenimiento de red',
    },
  ],

  LEVEL_3: [
    // Servicios avanzados
    {
      pattern: /\brecuperaci[oó]n\s+de\s+datos\b/i,
      weight: 4,
      description: 'Recuperación de datos',
    },
    {
      pattern: /\braid\b/i,
      weight: 4,
      description: 'RAID',
    },
    {
      pattern: /\bssd\b/i,
      weight: 2,
      description: 'SSD',
    },
    {
      pattern: /\bciberseguridad\b/i,
      weight: 4,
      description: 'Ciberseguridad',
    },
    {
      pattern: /\bfirewall\s+avanzado\b/i,
      weight: 4,
      description: 'Firewall avanzado',
    },
    {
      pattern: /\bservidores?\s+cr[ií]ticos?\b/i,
      weight: 4,
      description: 'Servidores críticos',
    },
    {
      pattern: /\bvirtualizaci[oó]n\b/i,
      weight: 3,
      description: 'Virtualización',
    },
    {
      pattern: /\bincident\s+response\b/i,
      weight: 4,
      description: 'Incident response',
    },
    {
      pattern: /\bbackup\s+(?:critico|replicaci[oó]n|disaster\s+recovery)\b/i,
      weight: 4,
      description: 'Backup crítico/DR',
    },
    {
      pattern: /\bserver\s+hardening\b/i,
      weight: 3,
      description: 'Server hardening',
    },
  ],
};

/**
 * Obtener keywords para un nivel de soporte.
 */
export function getKeywordsForLevel(
  level: Exclude<SupportLevel, 'UNKNOWN'>
): KeywordWeight[] {
  return PRICE_KEYWORDS[level] ?? [];
}

/**
 * Validar que todas las patterns sean RegExp válidos.
 * Llamar durante boot del sistema.
 */
export function validateKeywords(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [level, keywords] of Object.entries(PRICE_KEYWORDS)) {
    for (let i = 0; i < keywords.length; i++) {
      try {
        // Test pattern
        const { pattern } = keywords[i];
        pattern.test('');
      } catch (error) {
        errors.push(
          `${level}[${i}]: Invalid regex pattern - ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
