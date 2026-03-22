/**
 * Security Layer - Sensitive Data Redaction
 * Redaction utilities for logs, errors, and audit outputs
 */

import type { RedactionOptions } from '../types';
import {
  DEFAULT_MASK_CHARACTER,
  SECRET_MIN_LENGTH_FOR_MASKING,
  SECRET_SHOW_FIRST_COUNT,
  SECRET_SHOW_LAST_COUNT,
} from '../constants';
import { ALWAYS_SECRET_FIELDS, NEVER_LOG_FIELDS } from '../constants';

// =============================================================================
// CONFIG
// =============================================================================

/** Default redaction options */
const DEFAULT_REDACTION_OPTIONS: Required<RedactionOptions> = {
  preserveLength: false,
  maskCharacter: DEFAULT_MASK_CHARACTER,
  showFirst: SECRET_SHOW_FIRST_COUNT,
  showLast: SECRET_SHOW_LAST_COUNT,
  customFields: [],
  preserveFields: [],
};

// =============================================================================
// STRING REDACTION
// =============================================================================

/**
 * Redact a sensitive string
 */
export function redactSensitiveString(
  input: string,
  options?: RedactionOptions
): string {
  if (!input) return input;

  const opts = { ...DEFAULT_REDACTION_OPTIONS, ...options };
  const maskChar = opts.maskCharacter;

  if (input.length < SECRET_MIN_LENGTH_FOR_MASKING) {
    return maskChar.repeat(opts.preserveLength ? input.length : 8);
  }

  const first = input.substring(0, opts.showFirst);
  const last = input.substring(input.length - opts.showLast);
  const middleLength = input.length - opts.showFirst - opts.showLast;
  const middle = maskChar.repeat(opts.preserveLength ? middleLength : Math.min(middleLength, 8));

  return `${first}${middle}${last}`;
}

// =============================================================================
// OBJECT REDACTION
// =============================================================================

/**
 * Redact sensitive fields from an object
 */
export function redactSensitiveObject(
  input: unknown,
  options?: RedactionOptions
): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  const opts = { ...DEFAULT_REDACTION_OPTIONS, ...options };

  // Handle primitives
  if (typeof input !== 'object') {
    return typeof input === 'string' ? redactSensitiveString(input, opts) : input;
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveObject(item, opts));
  }

  // Handle objects
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    // Check if field should be preserved
    if (opts.preserveFields?.includes(key)) {
      result[key] = value;
      continue;
    }

    // Check if field is custom redact target
    if (opts.customFields?.includes(key)) {
      result[key] = redactSensitiveString(String(value), opts);
      continue;
    }

    // Check if field is always secret
    if (ALWAYS_SECRET_FIELDS.has(key.toLowerCase())) {
      result[key] = redactSensitiveString(String(value), opts);
      continue;
    }

    // Recursively process
    if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveObject(value, opts);
    } else if (typeof value === 'string') {
      // Check if value looks like a secret
      if (looksLikeSecret(value)) {
        result[key] = redactSensitiveString(value, opts);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// =============================================================================
// AUDIT LOG REDACTION
// =============================================================================

/**
 * Redact for audit log output
 */
export function redactForAuditLog(
  input: unknown,
  options?: RedactionOptions
): unknown {
  const opts = {
    ...DEFAULT_REDACTION_OPTIONS,
    ...options,
    customFields: [
      ...(options?.customFields ?? []),
      'password',
      'password_hash',
      'secret',
      'token',
      'key',
      'credential',
      'authorization',
      'bearer',
      ...NEVER_LOG_FIELDS,
    ],
  };

  return redactSensitiveObject(input, opts);
}

// =============================================================================
// ERROR RESPONSE REDACTION
// =============================================================================

/**
 * Redact for error response (client-facing)
 */
export function redactForErrorResponse(
  input: unknown,
  options?: RedactionOptions
): unknown {
  // For error responses, be more aggressive
  const opts = {
    ...DEFAULT_REDACTION_OPTIONS,
    ...options,
    preserveLength: false,
    customFields: [
      ...(options?.customFields ?? []),
      'stack',
      'stackTrace',
      'innerError',
      'cause',
      'originalError',
      'fullError',
    ],
  };

  return redactSensitiveObject(input, opts);
}

// =============================================================================
// API RESPONSE REDACTION
// =============================================================================

/**
 * Redact for API response
 */
export function redactForApiResponse(
  input: unknown,
  options?: RedactionOptions
): unknown {
  const opts = {
    ...DEFAULT_REDACTION_OPTIONS,
    ...options,
    customFields: [
      ...(options?.customFields ?? []),
      'internal_metadata',
      'system_notes',
      'admin_notes',
      'debug_info',
    ],
  };

  return redactSensitiveObject(input, opts);
}

// =============================================================================
// CONFIG REDACTION
// =============================================================================

/**
 * Redact environment config for logging
 */
export function redactConfigForLogs(
  config: Record<string, unknown>,
  options?: RedactionOptions
): unknown {
  return redactForAuditLog(config, options);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a value looks like a secret
 */
function looksLikeSecret(value: string): boolean {
  if (!value || value.length < 10) return false;

  const secretPatterns = [
    /^sk-[A-Za-z0-9]{20,}$/,
    /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    /^SG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{27,}$/,
    /^[A-Za-z0-9_-]{32,}$/,
  ];

  return secretPatterns.some((pattern) => pattern.test(value));
}

// =============================================================================
// REUSABLE REDACTORS
// =============================================================================

/**
 * Create a redaction function for specific field sets
 */
export function createFieldRedactor(
  fieldsToRedact: string[]
): (input: unknown) => unknown {
  return (input: unknown) =>
    redactSensitiveObject(input, { customFields: fieldsToRedact });
}

/**
 * Create an auditor-specific redaction function
 */
export function createAuditRedactor(): (input: unknown) => unknown {
  return (input: unknown) => redactForAuditLog(input);
}

/**
 * Create an error response redaction function
 */
export function createErrorRedactor(): (input: unknown) => unknown {
  return (input: unknown) => redactForErrorResponse(input);
}
