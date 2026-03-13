/**
 * Structured logger for @holi/network.
 *
 * Writes newline-delimited JSON to stdout — compatible with Datadog, GCP
 * Cloud Logging, and any log aggregation pipeline that ingests structured logs.
 *
 * Usage:
 *   import { logger, createLogger } from '@/lib/logger';
 *   logger.info({ referralId, orgId, event: 'CONSENT_GIVEN' }, 'Patient consented');
 *   const log = createLogger({ service: 'webhook', referralId });
 *   log.error({ err }, 'Booking failed');
 */

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type Bindings = Record<string, unknown>;

const LEVELS: Record<Level, number> = {
  trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60,
};

const activeLevel: number =
  LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info;

function write(level: Level, bindings: Bindings, msg: string, extra?: Bindings): void {
  if (LEVELS[level] < activeLevel) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    service: 'holi-network',
    ...bindings,
    ...(extra ?? {}),
    msg,
  };
  // Strip any PHI fields that accidentally leak into log entries
  delete (entry as Record<string, unknown>).patientPhone;
  delete (entry as Record<string, unknown>).phone;
  process.stdout.write(JSON.stringify(entry) + '\n');
}

export interface Logger {
  trace(extra: Bindings, msg: string): void;
  debug(extra: Bindings, msg: string): void;
  info(extra: Bindings, msg: string): void;
  warn(extra: Bindings, msg: string): void;
  error(extra: Bindings, msg: string): void;
  fatal(extra: Bindings, msg: string): void;
  child(bindings: Bindings): Logger;
}

function makeLogger(bindings: Bindings): Logger {
  return {
    trace: (extra, msg) => write('trace', bindings, msg, extra),
    debug: (extra, msg) => write('debug', bindings, msg, extra),
    info:  (extra, msg) => write('info',  bindings, msg, extra),
    warn:  (extra, msg) => write('warn',  bindings, msg, extra),
    error: (extra, msg) => write('error', bindings, msg, extra),
    fatal: (extra, msg) => write('fatal', bindings, msg, extra),
    child: (childBindings) => makeLogger({ ...bindings, ...childBindings }),
  };
}

export const logger = makeLogger({ service: 'holi-network' });

export function createLogger(bindings: Bindings): Logger {
  return logger.child(bindings);
}
