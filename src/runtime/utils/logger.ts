/**
 * Runtime Logger Utility
 *
 * Structured logging for the Affiliate runtime.
 */

import { resolveRuntimeEnvironment } from '../environment';
import type { RuntimeEnvironment } from '../types';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  environment?: RuntimeEnvironment;
  role?: string;
  pid?: number;
}

/**
 * Get the current log level from environment
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();

  switch (envLevel) {
    case 'debug': return 'debug';
    case 'info': return 'info';
    case 'warn': return 'warn';
    case 'error': return 'error';
    default:
      try {
        const env = resolveRuntimeEnvironment();
        return env === 'production' ? 'info' : 'debug';
      } catch {
        return 'info';
      }
  }
}

/**
 * Format a log entry for console output
 */
function formatEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, role, pid } = entry;

  const colors: Record<string, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m',
  };

  const levelColor = colors[level] || colors.info;
  const reset = colors.reset;

  let formatted = `${timestamp} ${levelColor}[${level.toUpperCase()}]${reset}`;
  if (role) formatted += ` [${role}]`;
  if (pid) formatted += ` (${pid})`;
  formatted += ` ${message}`;

  if (context && Object.keys(context).length > 0) {
    formatted += ` ${JSON.stringify(context)}`;
  }

  return formatted;
}

/**
 * Check if a log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

/**
 * Create a log entry
 */
function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    role: process.env.RUNTIME_ROLE,
    pid: process.pid,
  };
}

/**
 * Debug level logger
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  if (shouldLog('debug')) {
    console.log(formatEntry(createEntry('debug', message, context)));
  }
}

/**
 * Info level logger
 */
export function info(message: string, context?: Record<string, unknown>): void {
  if (shouldLog('info')) {
    console.log(formatEntry(createEntry('info', message, context)));
  }
}

/**
 * Warn level logger
 */
export function warn(message: string, context?: Record<string, unknown>): void {
  if (shouldLog('warn')) {
    console.warn(formatEntry(createEntry('warn', message, context)));
  }
}

/**
 * Error level logger
 */
export function error(message: string, context?: Record<string, unknown> & { error?: Error; stack?: string }): void {
  if (shouldLog('error')) {
    console.error(formatEntry(createEntry('error', message, context)));
    if (context?.error instanceof Error) {
      console.error(`  Stack: ${context.error.stack}`);
    }
  }
}

/**
 * Create a child logger with additional context
 */
function createChildLogger(additionalContext: Record<string, unknown>): Logger {
  return {
    debug(msg: string, ctx?: Record<string, unknown>): void {
      debug(msg, { ...additionalContext, ...ctx });
    },
    info(msg: string, ctx?: Record<string, unknown>): void {
      info(msg, { ...additionalContext, ...ctx });
    },
    warn(msg: string, ctx?: Record<string, unknown>): void {
      warn(msg, { ...additionalContext, ...ctx });
    },
    error(msg: string, ctx?: Record<string, unknown> & { error?: Error }): void {
      error(msg, { ...additionalContext, ...ctx });
    },
    child(moreContext: Record<string, unknown>): Logger {
      return createChildLogger({ ...additionalContext, ...moreContext });
    },
  };
}

export function child(additionalContext: Record<string, unknown>): Logger {
  return createChildLogger(additionalContext);
}

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown> & { error?: Error }): void;
  child(additionalContext: Record<string, unknown>): Logger;
}

/**
 * Create a logger instance
 */
export function createLogger(role?: string, environment?: RuntimeEnvironment): Logger {
  const baseContext: Record<string, unknown> = {};
  if (role) baseContext.role = role;
  if (environment) baseContext.environment = environment;
  return createChildLogger(baseContext);
}

// Default logger instance
export const logger: Logger = {
  debug,
  info,
  warn,
  error,
  child,
};
