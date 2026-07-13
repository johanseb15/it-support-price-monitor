/**
 * Logger estructurado para el scraper.
 * Proporciona contexto completo para debugging y monitoreo.
 */

import type { ScraperErrorContext } from '../../domain/errors/scraper-error';
import { ScraperError } from '../../domain/errors/scraper-error';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  message: string;
  context?: Record<string, unknown>;
  error?: ScraperErrorContext;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

/**
 * Logger por defecto que escribe en console.
 * En producción, integrar con Datadog, CloudWatch, etc.
 */
export class ConsoleLogger implements ILogger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug('[DEBUG]', message, context ?? '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', message, context ?? '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', message, context ?? '');
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const scraperError = error instanceof ScraperError
        ? error
        : new ScraperError('UNKNOWN_ERROR', String(error ?? ''), { cause: error });

      console.error('[ERROR]', message, {
        error: scraperError.toJSON(),
        ...context,
      });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.minLevel);
    const logIndex = levels.indexOf(level);
    return logIndex >= currentIndex;
  }
}

/**
 * Logger que acumula entradas en memoria.
 * Útil para tests y debugging.
 */
export class InMemoryLogger implements ILogger {
  private entries: LogEntry[] = [];
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'debug') {
    this.minLevel = minLevel;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.entries.push({
        level: 'debug',
        timestamp: new Date(),
        message,
        context,
      });
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.entries.push({
        level: 'info',
        timestamp: new Date(),
        message,
        context,
      });
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.entries.push({
        level: 'warn',
        timestamp: new Date(),
        message,
        context,
      });
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      let errorContext: ScraperErrorContext | undefined;

      if (error instanceof ScraperError) {
        errorContext = error.toJSON();
      } else if (error) {
        const scraperError = new ScraperError('UNKNOWN_ERROR', String(error), {
          cause: error,
        });
        errorContext = scraperError.toJSON();
      }

      this.entries.push({
        level: 'error',
        timestamp: new Date(),
        message,
        context,
        error: errorContext,
      });
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getErrors(): LogEntry[] {
    return this.entries.filter((e) => e.level === 'error');
  }

  clear(): void {
    this.entries = [];
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.minLevel);
    const logIndex = levels.indexOf(level);
    return logIndex >= currentIndex;
  }
}

/**
 * Instancia global del logger.
 * En tests, puede ser reemplazada por InMemoryLogger.
 */
let globalLogger: ILogger = new ConsoleLogger(
  process.env.LOG_LEVEL === 'debug' ? 'debug' : 'info'
);

export function getLogger(): ILogger {
  return globalLogger;
}

export function setLogger(logger: ILogger): void {
  globalLogger = logger;
}
