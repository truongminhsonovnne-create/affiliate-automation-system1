/**
 * Simple Logger Utility
 *
 * Lightweight logger with timestamp, levels, and color support.
 * Can be toggled via LOG_LEVEL environment variable.
 */

import { env } from '../config/env.js';

// ============================================
// Types
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

// ============================================
// Constants
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
} as const;

// ============================================
// Logger State
// ============================================

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const isColorEnabled = process.stdout.isTTY !== false;

// ============================================
// Helper Functions
// ============================================

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatLevel(level: LogLevel): string {
  const color = isColorEnabled ? getColor(level) : '';
  const reset = isColorEnabled ? COLORS.reset : '';

  const padded = level.toUpperCase().padEnd(5);
  return `${color}[${padded}]${reset}`;
}

function getColor(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return COLORS.gray;
    case 'info':
      return COLORS.blue;
    case 'warn':
      return COLORS.yellow;
    case 'error':
      return COLORS.red;
    default:
      return COLORS.reset;
  }
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = getTimestamp();
  const levelStr = formatLevel(level);

  let logLine = `${timestamp} ${levelStr} ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    // Filter out undefined and null values
    const filteredMeta = Object.entries(meta).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as LogMeta);

    if (Object.keys(filteredMeta).length > 0) {
      logLine += ` ${JSON.stringify(filteredMeta)}`;
    }
  }

  return logLine;
}

// ============================================
// Logger Functions
// ============================================

/**
 * Log debug message
 */
export function debug(message: string, meta?: LogMeta): void {
  if (shouldLog('debug')) {
    console.log(formatMessage('debug', message, meta));
  }
}

/**
 * Log info message
 */
export function info(message: string, meta?: LogMeta): void {
  if (shouldLog('info')) {
    console.log(formatMessage('info', message, meta));
  }
}

/**
 * Log warning message
 */
export function warn(message: string, meta?: LogMeta): void {
  if (shouldLog('warn')) {
    console.warn(formatMessage('warn', message, meta));
  }
}

/**
 * Log error message
 */
export function error(message: string, err?: Error | unknown, meta?: LogMeta): void {
  if (shouldLog('error')) {
    let errorMeta = meta || {};

    if (err instanceof Error) {
      errorMeta = {
        ...errorMeta,
        error: err.message,
        stack: err.stack,
      };
    } else if (err) {
      errorMeta = {
        ...errorMeta,
        error: String(err),
      };
    }

    console.error(formatMessage('error', message, errorMeta));
  }
}

/**
 * Log info with object
 */
export function log(message: string, meta?: LogMeta): void {
  info(message, meta);
}

// ============================================
// Advanced Features
// ============================================

/**
 * Create a child logger with context
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, meta?: LogMeta) =>
      debug(`[${context}] ${message}`, meta),
    info: (message: string, meta?: LogMeta) =>
      info(`[${context}] ${message}`, meta),
    warn: (message: string, meta?: LogMeta) =>
      warn(`[${context}] ${message}`, meta),
    error: (message: string, err?: Error | unknown, meta?: LogMeta) =>
      error(`[${context}] ${message}`, err, meta),
  };
}

/**
 * Measure execution time of async function
 */
export async function measureTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    info(`${name} completed`, { duration: `${duration}ms` });

    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    error(`${name} failed`, error as Error, { duration: `${duration}ms` });
    throw error;
  }
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Set log level programmatically
 */
export function setLogLevel(level: LogLevel): void {
  (process.env as Record<string, string>).LOG_LEVEL = level;
}

// ============================================
// Export
// ============================================

export type { LogLevel, LogMeta };

// Default export
const logger = {
  debug,
  info,
  warn,
  error,
  log,
  createLogger,
  measureTime,
  getLogLevel,
  setLogLevel,
};

export default logger;
