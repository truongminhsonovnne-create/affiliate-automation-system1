/**
 * Structured Logger
 *
 * Production-grade structured logging with correlation IDs,
 * context support, and multiple output formats.
 */

import {
  LOG_LEVEL,
  LOG_JSON,
  LOG_COLOR,
  LOG_DESTINATION,
  LOG_INCLUDE_STACKTRACE,
  SERVICE_NAME,
  ENVIRONMENT,
} from '../constants.js';
import type { LogEntry, LogLevel, LogContext, LogError } from '../types.js';

/** Log level priority for filtering */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/** ANSI color codes */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
} as const;

/** Color mapping for log levels */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
  fatal: COLORS.red + COLORS.bright,
};

/** Current log level as priority number */
const currentLevelPriority = LOG_LEVEL_PRIORITY[LOG_LEVEL];

/** Correlation ID generator */
let correlationCounter = 0;
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (++correlationCounter % 10000).toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${counter}-${random}`;
}

/**
 * Get current correlation ID from context or generate new one
 */
export function getCorrelationId(context?: LogContext): string {
  return context?.correlationId || generateCorrelationId();
}

/**
 * Format log entry as JSON
 */
function formatAsJson(entry: LogEntry): string {
  return JSON.stringify(entry, null, 0);
}

/**
 * Format log entry for console output
 */
function formatAsConsole(entry: LogEntry): string {
  const timestamp = entry.timestamp.substring(11, 23); // HH:mm:ss.SSS
  const level = entry.level.toUpperCase().padEnd(5);
  const color = LEVEL_COLORS[entry.level];

  let output = `${COLORS.gray}${timestamp}${COLORS.reset} `;
  output += `${color}${level}${COLORS.reset} `;
  output += `${COLORS.cyan}[${entry.context.service}]${COLORS.reset}`;

  if (entry.context.subsystem) {
    output += ` ${COLORS.blue}:${entry.context.subsystem}${COLORS.reset}`;
  }

  output += ` ${entry.message}`;

  if (entry.context.jobId) {
    output += ` ${COLORS.gray}job=${entry.context.jobId}${COLORS.reset}`;
  }

  if (entry.context.workerId) {
    output += ` ${COLORS.gray}worker=${entry.context.workerId}${COLORS.reset}`;
  }

  if (entry.context.channel) {
    output += ` ${COLORS.gray}channel=${entry.context.channel}${COLORS.reset}`;
  }

  if (entry.errors && entry.errors.length > 0) {
    output += '\n';
    for (const err of entry.errors) {
      output += `  ${COLORS.red}→ ${err.name}: ${err.message}${COLORS.reset}`;
      if (LOG_INCLUDE_STACKTRACE && err.stack) {
        output += '\n' + COLORS.gray + err.stack.split('\n').slice(1).join('\n') + COLORS.reset;
      }
    }
  }

  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    output += '\n  ' + COLORS.gray + JSON.stringify(entry.metadata) + COLORS.reset;
  }

  return output;
}

/**
 * Create a log entry object
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext,
  errors?: LogError[],
  metadata?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: {
      service: SERVICE_NAME,
      environment: ENVIRONMENT,
      ...context,
    },
    errors,
    metadata,
  };
}

/**
 * Write log entry to output
 */
function writeLog(entry: LogEntry): void {
  // Skip if below log level
  if (LOG_LEVEL_PRIORITY[entry.level] < currentLevelPriority) {
    return;
  }

  const output = LOG_JSON ? formatAsJson(entry) : formatAsConsole(entry);

  switch (LOG_DESTINATION) {
    case 'console':
      console.log(output);
      break;
    case 'stdout':
      process.stdout.write(output + '\n');
      break;
    case 'stderr':
      process.stderr.write(output + '\n');
      break;
    default:
      console.log(output);
  }

  // Also write errors to stderr
  if (entry.level === 'error' || entry.level === 'fatal') {
    if (LOG_DESTINATION !== 'stderr') {
      console.error(output);
    }
  }
}

// =============================================================================
// PUBLIC LOGGING API
// =============================================================================

/**
 * Create a logger instance with pre-configured context
 */
export function createLogger(defaultContext: Partial<LogContext> = {}) {
  const baseContext: LogContext = {
    service: SERVICE_NAME,
    ...defaultContext,
  };

  return {
    debug(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>) {
      writeLog(createLogEntry('debug', message, { ...baseContext, ...context }, undefined, metadata));
    },

    info(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>) {
      writeLog(createLogEntry('info', message, { ...baseContext, ...context }, undefined, metadata));
    },

    warn(message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>) {
      writeLog(createLogEntry('warn', message, { ...baseContext, ...context }, undefined, metadata));
    },

    error(message: string, error?: Error | LogError, context?: Partial<LogContext>) {
      const errors: LogError[] = [];

      if (error) {
        if (error instanceof Error) {
          errors.push({
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause?.toString(),
          });
        } else {
          errors.push(error as LogError);
        }
      }

      writeLog(createLogEntry('error', message, { ...baseContext, ...context }, errors));
    },

    fatal(message: string, error?: Error | LogError, context?: Partial<LogContext>) {
      const errors: LogError[] = [];

      if (error) {
        if (error instanceof Error) {
          errors.push({
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause?.toString(),
          });
        } else {
          errors.push(error as LogError);
        }
      }

      writeLog(createLogEntry('fatal', message, { ...baseContext, ...context }, errors));
    },

    withContext(additionalContext: Partial<LogContext>) {
      return createLogger({ ...baseContext, ...additionalContext });
    },
  };
}

/**
 * Default logger instance
 */
export const log = createLogger();

/**
 * Convenience functions using the default logger
 */
export const debug = (message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>) =>
  log.debug(message, context, metadata);

export const info = (message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>) =>
  log.info(message, context, metadata);

export const warn = (message: string, context?: Partial<LogContext>, metadata?: Record<string, unknown>) =>
  log.warn(message, context, metadata);

export const error = (message: string, err?: Error | LogError, context?: Partial<LogContext>) =>
  log.error(message, err, context);

export const fatal = (message: string, err?: Error | LogError, context?: Partial<LogContext>) =>
  log.fatal(message, err, context);

/**
 * Log an operation with timing
 */
export function logOperation<T>(
  operation: string,
  fn: () => Promise<T> | T,
  context?: Partial<LogContext>
): Promise<T> {
  const startTime = Date.now();
  const correlationId = context?.correlationId || generateCorrelationId();

  debug(`Starting: ${operation}`, { ...context, correlationId, operation });

  return (async () => {
    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      debug(`Completed: ${operation}`, {
        ...context,
        correlationId,
        operation,
        metadata: { durationMs: duration },
      });

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const error = err instanceof Error ? err : new Error(String(err));

      error(`Failed: ${operation}`, error, {
        ...context,
        correlationId,
        operation,
        metadata: { durationMs: duration },
      });

      throw err;
    }
  })();
}

/**
 * Log an operation with timing (sync version)
 */
export function logOperationSync<T>(
  operation: string,
  fn: () => T,
  context?: Partial<LogContext>
): T {
  const startTime = Date.now();
  const correlationId = context?.correlationId || generateCorrelationId();

  debug(`Starting: ${operation}`, { ...context, correlationId, operation });

  try {
    const result = fn();
    const duration = Date.now() - startTime;

    debug(`Completed: ${operation}`, {
      ...context,
      correlationId,
      operation,
      metadata: { durationMs: duration },
    });

    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));

    error(`Failed: ${operation}`, error, {
      ...context,
      correlationId,
      operation,
      metadata: { durationMs: duration },
    });

    throw err;
  }
}

export { createLogger as loggerFactory };
export type { LogContext, LogError };
