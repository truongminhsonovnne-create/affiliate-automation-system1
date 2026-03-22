/**
 * Security Layer - Secret Access Policy
 * Policy for controlling secret access
 */

import type { ActorIdentity, SecurityCheckResult } from '../types';
import { getSecretMetadata, isSecretAllowedInDomain } from '../config/secretRegistry';
import { isSecretHighSensitivity } from '../config/secretRegistry';
import type { SecurityDomain } from '../types';

// =============================================================================
// ACCESS CHECKS
// =============================================================================

/**
 * Check if actor can access a secret
 */
export function canAccessSecret(
  actor: ActorIdentity,
  secretName: string,
  context?: {
    domain?: SecurityDomain;
    operation?: 'read' | 'write' | 'rotate';
  }
): SecurityCheckResult {
  // System workers can access secrets in their domain
  if (actor.role === 'system_worker') {
    const secret = getSecretMetadata(secretName);
    if (secret) {
      // Check if secret is allowed in worker's domain
      const domain = context?.domain;
      if (domain && !isSecretAllowedInDomain(secretName, domain)) {
        return {
          passed: false,
          reason: `Secret '${secretName}' is not allowed in domain '${domain}'`,
        };
      }
      return { passed: true };
    }
  }

  // Super admin can access metadata, but not the secrets themselves
  if (actor.role === 'super_admin') {
    if (context?.operation === 'read') {
      // Can read metadata
      return { passed: true };
    }
    return { passed: true };
  }

  // Other roles cannot access secrets directly
  return {
    passed: false,
    reason: `Role '${actor.role}' cannot access secrets`,
  };
}

/**
 * Require secret access - throws if not allowed
 */
export function requireSecretAccess(
  actor: ActorIdentity,
  secretName: string,
  context?: {
    domain?: SecurityDomain;
    operation?: 'read' | 'write' | 'rotate';
  }
): void {
  const result = canAccessSecret(actor, secretName, context);

  if (!result.passed) {
    const error = new Error(result.reason ?? 'Secret access denied');
    (error as any).code = 'SECRET_ACCESS_DENIED';
    throw error;
  }
}

/**
 * Build secret access decision
 */
export function buildSecretAccessDecision(
  actor: ActorIdentity,
  secretName: string,
  context?: {
    domain?: SecurityDomain;
    operation?: 'read' | 'write' | 'rotate';
  }
): {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
  metadata?: {
    isHighSensitivity: boolean;
    isRotatable: boolean;
    classification?: string;
  };
} {
  const secret = getSecretMetadata(secretName);
  const isHighSensitivity = isSecretHighSensitivity(secretName);

  // Check access
  const accessResult = canAccessSecret(actor, secretName, context);

  const warnings: string[] = [];

  // Add warnings for high-sensitivity secrets
  if (isHighSensitivity && accessResult.allowed) {
    warnings.push(`'${secretName}' is a high-sensitivity secret. Ensure proper audit trail.`);
  }

  return {
    allowed: accessResult.passed,
    reason: accessResult.reason,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      isHighSensitivity,
      isRotatable: secret?.isRotatable ?? false,
      classification: secret?.classification,
    },
  };
}

// =============================================================================
// DOMAIN ACCESS
// =============================================================================

/**
 * Check if domain can access secret
 */
export function canDomainAccessSecret(
  domain: SecurityDomain,
  secretName: string
): boolean {
  return isSecretAllowedInDomain(secretName, domain);
}

/**
 * Get secrets accessible by domain
 */
export function getSecretsAccessibleByDomain(
  domain: SecurityDomain
): string[] {
  const { getRegisteredSecrets } = require('../config/secretRegistry');
  const secrets = getRegisteredSecrets();

  return secrets
    .filter((s) => s.allowedDomains.includes(domain))
    .map((s) => s.name);
}

// =============================================================================
// BULK ACCESS CHECK
// =============================================================================

/**
 * Check access for multiple secrets
 */
export function canAccessSecrets(
  actor: ActorIdentity,
  secretNames: string[],
  context?: {
    domain?: SecurityDomain;
    operation?: 'read' | 'write' | 'rotate';
  }
): {
  allowed: string[];
  denied: Array<{ name: string; reason: string }>;
} {
  const allowed: string[] = [];
  const denied: Array<{ name: string; reason: string }> = [];

  for (const name of secretNames) {
    const result = canAccessSecret(actor, name, context);
    if (result.passed) {
      allowed.push(name);
    } else {
      denied.push({ name, reason: result.reason ?? 'Access denied' });
    }
  }

  return { allowed, denied };
}
