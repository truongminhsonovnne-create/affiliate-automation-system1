/**
 * Security Layer - Secret Registry
 * Central registry for all secrets in the system
 */

import type { SecretReference, SecretClassification, SecurityDomain } from '../types';
import { SECRET_CLASSIFICATION, SECURITY_DOMAINS } from '../types';

// =============================================================================
// SECRET REGISTRY
// =============================================================================

/** All registered secrets in the system */
const SECRET_REGISTRY: Record<string, SecretReference> = {
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    classification: SECRET_CLASSIFICATION.SECRET,
    allowedDomains: [SECURITY_DOMAINS.CONTROL_PLANE, SECURITY_DOMAINS.INTERNAL],
    isRotatable: true,
    rotationPeriodDays: 90,
  },
  SUPABASE_ANON_KEY: {
    name: 'SUPABASE_ANON_KEY',
    classification: SECRET_CLASSIFICATION.INTERNAL,
    allowedDomains: [SECURITY_DOMAINS.PUBLIC, SECURITY_DOMAINS.INTERNAL],
    isRotatable: true,
    rotationPeriodDays: 180,
  },

  // AI Services
  GEMINI_API_KEY: {
    name: 'GEMINI_API_KEY',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [SECURITY_DOMAINS.AI_ENRICHMENT],
    isRotatable: true,
    rotationPeriodDays: 30,
  },

  // Crawler APIs
  SHOPEE_API_KEY: {
    name: 'SHOPEE_API_KEY',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [SECURITY_DOMAINS.CRAWLER],
    isRotatable: true,
    rotationPeriodDays: 30,
  },
  LAZADA_API_KEY: {
    name: 'LAZADA_API_KEY',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [SECURITY_DOMAINS.CRAWLER],
    isRotatable: true,
    rotationPeriodDays: 30,
  },
  TIKI_API_KEY: {
    name: 'TIKI_API_KEY',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [SECURITY_DOMAINS.CRAWLER],
    isRotatable: true,
    rotationPeriodDays: 30,
  },

  // Publishing
  FACEBOOK_ACCESS_TOKEN: {
    name: 'FACEBOOK_ACCESS_TOKEN',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [SECURITY_DOMAINS.PUBLISHING],
    isRotatable: true,
    rotationPeriodDays: 60,
  },
  TIKTOK_ACCESS_TOKEN: {
    name: 'TIKTOK_ACCESS_TOKEN',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [SECURITY_DOMAINS.PUBLISHING],
    isRotatable: true,
    rotationPeriodDays: 60,
  },

  // Internal Auth
  INTERNAL_AUTH_SECRET: {
    name: 'INTERNAL_AUTH_SECRET',
    classification: SECRET_CLASSIFICATION.SECRET,
    allowedDomains: [SECURITY_DOMAINS.CONTROL_PLANE, SECURITY_DOMAINS.INTERNAL],
    isRotatable: true,
    rotationPeriodDays: 30,
  },
  SESSION_SECRET: {
    name: 'SESSION_SECRET',
    classification: SECRET_CLASSIFICATION.SECRET,
    allowedDomains: [SECURITY_DOMAINS.ADMIN, SECURITY_DOMAINS.CONTROL_PLANE],
    isRotatable: true,
    rotationPeriodDays: 30,
  },

  // Database
  DATABASE_URL: {
    name: 'DATABASE_URL',
    classification: SECRET_CLASSIFICATION.RESTRICTED,
    allowedDomains: [
      SECURITY_DOMAINS.CONTROL_PLANE,
      SECURITY_DOMAINS.INTERNAL,
      SECURITY_DOMAINS.CRAWLER,
      SECURITY_DOMAINS.AI_ENRICHMENT,
      SECURITY_DOMAINS.PUBLISHING,
    ],
    isRotatable: false,
  },

  // Admin
  ADMIN_INVITE_TOKEN: {
    name: 'ADMIN_INVITE_TOKEN',
    classification: SECRET_CLASSIFICATION.CONFIDENTIAL,
    allowedDomains: [SECURITY_DOMAINS.ADMIN],
    isRotatable: true,
    rotationPeriodDays: 7,
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Get all registered secrets
 */
export function getRegisteredSecrets(): SecretReference[] {
  return Object.values(SECRET_REGISTRY);
}

/**
 * Get metadata for a specific secret
 */
export function getSecretMetadata(name: string): SecretReference | undefined {
  return SECRET_REGISTRY[name.toUpperCase()];
}

/**
 * Classify a secret by name
 */
export function classifySecret(name: string): SecretClassification {
  const secret = getSecretMetadata(name);
  return secret?.classification ?? SECRET_CLASSIFICATION.INTERNAL;
}

/**
 * Check if a secret is rotatable
 */
export function isSecretRotatable(name: string): boolean {
  const secret = getSecretMetadata(name);
  return secret?.isRotatable ?? false;
}

/**
 * Check if a secret is allowed in a specific domain
 */
export function isSecretAllowedInDomain(name: string, domain: SecurityDomain): boolean {
  const secret = getSecretMetadata(name);
  if (!secret) {
    // Unknown secrets are not allowed
    return false;
  }
  return secret.allowedDomains.includes(domain);
}

/**
 * Check if a secret is high-sensitivity
 */
export function isSecretHighSensitivity(name: string): boolean {
  const classification = classifySecret(name);
  return classification === SECRET_CLASSIFICATION.RESTRICTED || classification === SECRET_CLASSIFICATION.SECRET;
}

/**
 * Check if a secret is server-only
 */
export function isSecretServerOnly(name: string): boolean {
  const classification = classifySecret(name);
  return classification !== SECRET_CLASSIFICATION.PUBLIC_SAFE;
}

/**
 * Get secrets by classification
 */
export function getSecretsByClassification(classification: SecretClassification): SecretReference[] {
  return getRegisteredSecrets().filter((s) => s.classification === classification);
}

/**
 * Get all restricted secrets
 */
export function getRestrictedSecrets(): SecretReference[] {
  return getSecretsByClassification(SECRET_CLASSIFICATION.RESTRICTED)
    .concat(getSecretsByClassification(SECRET_CLASSIFICATION.SECRET));
}

/**
 * Validate that a secret exists in registry
 */
export function validateSecretExists(name: string): boolean {
  return getSecretMetadata(name) !== undefined;
}

/**
 * Get rotation period for a secret
 */
export function getSecretRotationPeriodDays(name: string): number | undefined {
  const secret = getSecretMetadata(name);
  return secret?.rotationPeriodDays;
}

// =============================================================================
// HELPER: CHECK IF ENV VAR IS REGISTERED
// =============================================================================

/**
 * Check if an environment variable name is a registered secret
 */
export function isRegisteredSecret(envVarName: string): boolean {
  return SECRET_REGISTRY.hasOwnProperty(envVarName.toUpperCase());
}

/**
 * Get all environment variable names that are registered secrets
 */
export function getRegisteredSecretEnvNames(): string[] {
  return Object.keys(SECRET_REGISTRY);
}

/**
 * Validate all registered secrets are present in environment
 */
export function validateEnvironmentSecrets(): {
  missing: string[];
  present: string[];
} {
  const envVars = Object.keys(process.env).filter((k) => process.env[k]);
  const registered = getRegisteredSecretEnvNames();

  const present = registered.filter((r) => envVars.includes(r));
  const missing = registered.filter((r) => !envVars.includes(r));

  return { missing, present };
}
