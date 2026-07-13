/**
 * Tipología de errores del scraper con contexto y trazabilidad.
 * Reemplaza el uso genérico de compactError().
 */

export type ScraperErrorType =
  | 'DISCOVERY_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERSISTENCE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export interface ScraperErrorContext {
  type: ScraperErrorType;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Error tipado para el sistema de scraping.
 * Proporciona contexto completo para debugging y retries.
 */
export class ScraperError extends Error {
  readonly type: ScraperErrorType;
  readonly context: Record<string, unknown>;
  readonly recoverable: boolean;
  readonly timestamp: Date;

  constructor(
    type: ScraperErrorType,
    message: string,
    options: {
      cause?: unknown;
      context?: Record<string, unknown>;
      recoverable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'ScraperError';
    this.type = type;
    this.context = options.context ?? {};
    this.recoverable = options.recoverable ?? false;
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Mantener stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ScraperError);
    }
  }

  toJSON(): ScraperErrorContext {
    return {
      type: this.type,
      message: this.message,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
    };
  }

  toString(): string {
    return `[${this.type}] ${this.message}${
      Object.keys(this.context).length > 0
        ? ` | ${JSON.stringify(this.context)}`
        : ''
    }`;
  }
}

/**
 * Convierte errores genéricos a ScraperError tipados.
 * Mantiene contexto y permite detectar tipo de error automáticamente.
 */
export function normalizeScraperError(
  error: unknown,
  defaultType: ScraperErrorType = 'UNKNOWN_ERROR',
  context?: Record<string, unknown>
): ScraperError {
  if (error instanceof ScraperError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const type = inferErrorType(error, defaultType);
  const recoverable = isRecoverableError(type, error);

  return new ScraperError(type, message, {
    cause: error,
    context,
    recoverable,
  });
}

/**
 * Inferir tipo de error basado en contenido del mensaje o causa.
 */
function inferErrorType(
  error: unknown,
  fallback: ScraperErrorType
): ScraperErrorType {
  if (error instanceof ScraperError) {
    return error.type;
  }

  const message = error instanceof Error
    ? error.message.toLowerCase()
    : String(error).toLowerCase();

  if (
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset')
  ) {
    return 'TIMEOUT_ERROR';
  }

  if (
    message.includes('network') ||
    message.includes('enotfound') ||
    message.includes('getaddrinfo')
  ) {
    return 'NETWORK_ERROR';
  }

  if (
    message.includes('parse') ||
    message.includes('json') ||
    message.includes('html')
  ) {
    return 'PARSE_ERROR';
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('constraint')
  ) {
    return 'VALIDATION_ERROR';
  }

  if (
    message.includes('database') ||
    message.includes('prisma') ||
    message.includes('unique')
  ) {
    return 'PERSISTENCE_ERROR';
  }

  if (message.includes('discovery') || message.includes('serpapi')) {
    return 'DISCOVERY_ERROR';
  }

  return fallback;
}

/**
 * Determinar si un error es recuperable (reintentar tiene sentido).
 */
function isRecoverableError(
  type: ScraperErrorType,
  error: unknown
): boolean {
  // Errores de red y timeout son recuperables
  if (type === 'NETWORK_ERROR' || type === 'TIMEOUT_ERROR') {
    return true;
  }

  // Parse errors pueden serlo si es por datos malformados (reintentar otra página)
  if (type === 'PARSE_ERROR') {
    return true;
  }

  // Errores de validación NO son recuperables (datos malos)
  if (type === 'VALIDATION_ERROR') {
    return false;
  }

  // Errores de persistencia dependen del tipo
  if (type === 'PERSISTENCE_ERROR') {
    const message = error instanceof Error ? error.message : String(error);
    // Duplicate key no es recuperable en este contexto
    if (message.includes('unique') || message.includes('duplicate')) {
      return false;
    }
    // Otros errores de BD podrían serlo
    return true;
  }

  return false;
}
