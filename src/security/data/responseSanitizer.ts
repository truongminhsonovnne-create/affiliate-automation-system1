/**
 * Security Layer - Response Sanitizer
 * Sanitizes API responses to prevent sensitive data exposure
 */

import { shouldExposeFieldToClient, classifyDataField } from './dataClassification';
import { redactSensitiveObject, redactForApiResponse } from '../redaction/sensitiveDataRedaction';
import { NEVER_CLIENT_EXPOSE_FIELDS } from '../constants';

// =============================================================================
// TYPES
// =============================================================================

/** Sanitization context */
export interface SanitizationContext {
  /** Target audience */
  target: 'admin' | 'operator' | 'public';

  /** Resource type */
  resourceType?: string;

  /** Actor role */
  actorRole?: string;

  /** Include debug info */
  includeDebug?: boolean;
}

// =============================================================================
// SANITIZERS
// =============================================================================

/**
 * Sanitize admin API response
 */
export function sanitizeAdminApiResponse(
  data: unknown,
  context?: SanitizationContext
): unknown {
  return sanitizeResponse(data, {
    ...context,
    target: 'admin',
  });
}

/**
 * Sanitize operational snapshot (for operators)
 */
export function sanitizeOperationalSnapshot(
  data: unknown,
  context?: SanitizationContext
): unknown {
  return sanitizeResponse(data, {
    ...context,
    target: 'operator',
  });
}

/**
 * Sanitize audit record
 */
export function sanitizeAuditRecord(
  data: unknown,
  context?: SanitizationContext
): unknown {
  return sanitizeResponse(data, {
    ...context,
    target: 'admin',
  });
}

/**
 * Sanitize publish job detail
 */
export function sanitizePublishJobDetail(
  data: unknown,
  context?: SanitizationContext
): unknown {
  return sanitizeResponse(data, {
    ...context,
    resourceType: 'publish_job',
    target: 'admin',
  });
}

// =============================================================================
// CORE SANITIZATION
// =============================================================================

/**
 * Core sanitization function
 */
function sanitizeResponse(
  data: unknown,
  context: SanitizationContext
): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeItem(item, context));
  }

  // Handle objects
  if (typeof data === 'object') {
    return sanitizeObject(data as Record<string, unknown>, context);
  }

  return data;
}

/**
 * Sanitize single item
 */
function sanitizeItem(
  item: unknown,
  context: SanitizationContext
): unknown {
  if (item === null || item === undefined) {
    return item;
  }

  if (Array.isArray(item)) {
    return item.map((i) => sanitizeItem(i, context));
  }

  if (typeof item === 'object') {
    return sanitizeObject(item as Record<string, unknown>, context);
  }

  return item;
}

/**
 * Sanitize object
 */
function sanitizeObject(
  obj: Record<string, unknown>,
  context: SanitizationContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if field should be exposed
    const exposure = shouldExposeFieldToClient(key, {
      role: context.actorRole,
    });

    if (!exposure.allowed) {
      // Don't expose restricted fields
      result[key] = '[redacted]';
      continue;
    }

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        result[key] = value.map((item) => sanitizeItem(item, context));
      } else {
        result[key] = sanitizeObject(value as Record<string, unknown>, context);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// =============================================================================
// ADVANCED SANITIZATION
// =============================================================================

/**
 * Deep sanitize with full redaction
 */
export function sanitizeWithRedaction(
  data: unknown,
  context?: {
    redactPatterns?: string[];
    preserveFields?: string[];
  }
): unknown {
  return redactForApiResponse(data, {
    customFields: context?.redactPatterns,
    preserveFields: context?.preserveFields,
  });
}

/**
 * Sanitize error response
 */
export function sanitizeErrorResponse(
  error: unknown,
  context?: SanitizationContext
): {
  message: string;
  code?: string;
  details?: unknown;
} {
  // Extract safe error information
  const errorObj = error as Record<string, unknown>;

  return {
    message: String(errorObj.message ?? 'An error occurred'),
    code: errorObj.code as string | undefined,
    details: sanitizeResponse(errorObj.details, context ?? { target: 'admin' }),
  };
}

// =============================================================================
// FIELD-LEVEL SANITIZATION
// =============================================================================

/**
 * Filter object to only include allowed fields
 */
export function filterFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: string[]
): Partial<T> {
  const result: Partial<T> = {};

  for (const field of allowedFields) {
    if (field in obj) {
      result[field as keyof T] = obj[field];
    }
  }

  return result;
}

/**
 * Remove sensitive fields from object
 */
export function removeSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = [...NEVER_CLIENT_EXPOSE_FIELDS]
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!sensitiveFields.includes(key.toLowerCase())) {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * Create a sanitization pipeline
 */
export function createSanitizationPipeline(
  ...sanitizers: Array<(data: unknown) => unknown>
): (data: unknown) => unknown {
  return (data: unknown) => {
    return sanitizers.reduce((acc, sanitizer) => sanitizer(acc), data);
  };
}
