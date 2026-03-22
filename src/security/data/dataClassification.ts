/**
 * Security Layer - Data Classification
 * Classification of data fields for access control
 */

import type { DataClassification } from '../types';
import { DATA_CLASSIFICATION } from '../types';
import { NEVER_CLIENT_EXPOSE_FIELDS, ALWAYS_RESTRICTED_FIELDS } from '../constants';

// =============================================================================
// FIELD CLASSIFICATIONS
// =============================================================================

/** Field classification map */
const FIELD_CLASSIFICATIONS: Record<string, DataClassification> = {
  // Public-safe fields
  id: DATA_CLASSIFICATION.PUBLIC,
  name: DATA_CLASSIFICATION.PUBLIC,
  title: DATA_CLASSIFICATION.PUBLIC,
  description: DATA_CLASSIFICATION.PUBLIC,
  status: DATA_CLASSIFICATION.PUBLIC,
  created_at: DATA_CLASSIFICATION.PUBLIC,
  updated_at: DATA_CLASSIFICATION.PUBLIC,
  slug: DATA_CLASSIFICATION.PUBLIC,
  url: DATA_CLASSIFICATION.PUBLIC,
  image_url: DATA_CLASSIFICATION.PUBLIC,
  price: DATA_CLASSIFICATION.PUBLIC,
  currency: DATA_CLASSIFICATION.PUBLIC,

  // Internal fields
  metadata: DATA_CLASSIFICATION.INTERNAL,
  settings: DATA_CLASSIFICATION.INTERNAL,
  preferences: DATA_CLASSIFICATION.INTERNAL,
  tags: DATA_CLASSIFICATION.INTERNAL,
  category: DATA_CLASSIFICATION.INTERNAL,
  category_id: DATA_CLASSIFICATION.INTERNAL,
  product_id: DATA_CLASSIFICATION.INTERNAL,
  job_id: DATA_CLASSIFICATION.INTERNAL,

  // Confidential fields
  error: DATA_CLASSIFICATION.CONFIDENTIAL,
  error_message: DATA_CLASSIFICATION.CONFIDENTIAL,
  error_stack: DATA_CLASSIFICATION.CONFIDENTIAL,
  warning: DATA_CLASSIFICATION.CONFIDENTIAL,
  progress: DATA_CLASSIFICATION.CONFIDENTIAL,
  retry_count: DATA_CLASSIFICATION.CONFIDENTIAL,
  retry_count: DATA_CLASSIFICATION.CONFIDENTIAL,
  request_id: DATA_CLASSIFICATION.CONFIDENTIAL,
  correlation_id: DATA_CLASSIFICATION.CONFIDENTIAL,

  // Restricted fields
  user_id: DATA_CLASSIFICATION.RESTRICTED,
  owner_id: DATA_CLASSIFICATION.RESTRICTED,
  actor_id: DATA_CLASSIFICATION.RESTRICTED,
  email: DATA_CLASSIFICATION.RESTRICTED,
  phone: DATA_CLASSIFICATION.RESTRICTED,
  ip_address: DATA_CLASSIFICATION.RESTRICTED,
  user_agent: DATA_CLASSIFICATION.RESTRICTED,

  // Secret fields (never expose)
  password: DATA_CLASSIFICATION.RESTRICTED,
  password_hash: DATA_CLASSIFICATION.RESTRICTED,
  api_key: DATA_CLASSIFICATION.RESTRICTED,
  secret_key: DATA_CLASSIFICATION.RESTRICTED,
  access_token: DATA_CLASSIFICATION.RESTRICTED,
  refresh_token: DATA_CLASSIFICATION.RESTRICTED,
  private_key: DATA_CLASSIFICATION.RESTRICTED,
  service_role_key: DATA_CLASSIFICATION.RESTRICTED,
  session_token: DATA_CLASSIFICATION.RESTRICTED,
  csrf_token: DATA_CLASSIFICATION.RESTRICTED,
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Classify a data field
 */
export function classifyDataField(
  fieldName: string,
  context?: {
    resourceType?: string;
    action?: 'read' | 'write' | 'execute';
  }
): DataClassification {
  // Check explicit classification
  const explicit = FIELD_CLASSIFICATIONS[fieldName.toLowerCase()];
  if (explicit) {
    return explicit;
  }

  // Check if always restricted
  if (ALWAYS_RESTRICTED_FIELDS.has(fieldName.toLowerCase())) {
    return DATA_CLASSIFICATION.RESTRICTED;
  }

  // Check if never exposed to client
  if (NEVER_CLIENT_EXPOSE_FIELDS.has(fieldName.toLowerCase())) {
    return DATA_CLASSIFICATION.RESTRICTED;
  }

  // Default to internal
  return DATA_CLASSIFICATION.INTERNAL;
}

/**
 * Get sensitive field policy
 */
export function getSensitiveFieldPolicy(
  fieldName: string,
  context?: {
    target?: 'logs' | 'client' | 'audit' | 'database';
  }
): {
  redact: boolean;
  classify: DataClassification;
  reason?: string;
} {
  const classification = classifyDataField(fieldName, context as any);
  const target = context?.target ?? 'client';

  let redact = false;
  let reason: string | undefined;

  switch (target) {
    case 'logs':
      redact = classification === DATA_CLASSIFICATION.RESTRICTED ||
        classification === DATA_CLASSIFICATION.CONFIDENTIAL;
      reason = redact ? 'Restricted/confidential for logs' : undefined;
      break;

    case 'client':
      redact = classification === DATA_CLASSIFICATION.RESTRICTED ||
        NEVER_CLIENT_EXPOSE_FIELDS.has(fieldName.toLowerCase());
      reason = redact ? 'Never expose to client' : undefined;
      break;

    case 'audit':
      redact = classification === DATA_CLASSIFICATION.RESTRICTED;
      reason = redact ? 'Restricted for audit' : undefined;
      break;

    case 'database':
      // Database can store but may need encryption
      redact = false;
      break;
  }

  return {
    redact,
    classify: classification,
    reason,
  };
}

/**
 * Should persist sensitive field
 */
export function shouldPersistSensitiveField(
  fieldName: string,
  context?: {
    encryptAtRest?: boolean;
  }
): {
  allowed: boolean;
  encryption?: string;
  reason?: string;
} {
  const classification = classifyDataField(fieldName);

  // Secret fields shouldn't be persisted in plain text
  if (classification === DATA_CLASSIFICATION.RESTRICTED) {
    const fieldLower = fieldName.toLowerCase();
    if (
      fieldLower.includes('password') ||
      fieldLower.includes('secret') ||
      fieldLower.includes('private_key')
    ) {
      return {
        allowed: false,
        reason: 'Secret fields should not be persisted',
      };
    }
  }

  return { allowed: true };
}

/**
 * Should expose field to client
 */
export function shouldExposeFieldToClient(
  fieldName: string,
  context?: {
    role?: string;
  }
): {
  allowed: boolean;
  reason?: string;
} {
  // Check never expose list
  if (NEVER_CLIENT_EXPOSE_FIELDS.has(fieldName.toLowerCase())) {
    return {
      allowed: false,
      reason: 'Field is in never-expose list',
    };
  }

  // Check classification
  const classification = classifyDataField(fieldName);
  if (classification === DATA_CLASSIFICATION.RESTRICTED) {
    return {
      allowed: false,
      reason: 'Field is classified as restricted',
    };
  }

  return { allowed: true };
}

/**
 * Get all fields by classification
 */
export function getFieldsByClassification(
  classification: DataClassification
): string[] {
  return Object.entries(FIELD_CLASSIFICATIONS)
    .filter(([, c]) => c === classification)
    .map(([field]) => field);
}

/**
 * Check if field is public-safe
 */
export function isFieldPublicSafe(fieldName: string): boolean {
  return classifyDataField(fieldName) === DATA_CLASSIFICATION.PUBLIC;
}

/**
 * Check if field is internal-only
 */
export function isFieldInternalOnly(fieldName: string): boolean {
  const classification = classifyDataField(fieldName);
  return classification === DATA_CLASSIFICATION.INTERNAL ||
    classification === DATA_CLASSIFICATION.CONFIDENTIAL;
}

/**
 * Check if field is restricted
 */
export function isFieldRestricted(fieldName: string): boolean {
  return classifyDataField(fieldName) === DATA_CLASSIFICATION.RESTRICTED;
}
