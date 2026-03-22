/**
 * Environment Promotion Module
 *
 * Manages environment promotion logic and policies.
 */

import type { ReleasePromotionDecision, CiEnvironment } from '../types';
import { ENVIRONMENT_SETTINGS } from '../constants';

// =============================================================================
// Promotion Logic
// =============================================================================

/**
 * Check if promotion is allowed from source to target environment
 */
export function canPromoteToEnvironment(
  source: CiEnvironment,
  target: CiEnvironment,
  context?: {
    version?: string;
    approvedBy?: string;
  }
): boolean {
  const decision = buildPromotionDecision(source, target, context);
  return decision.allowed;
}

/**
 * Build promotion decision
 */
export function buildPromotionDecision(
  source: CiEnvironment,
  target: CiEnvironment,
  context?: {
    version?: string;
    approvedBy?: string;
  }
): ReleasePromotionDecision {
  // Define valid promotion paths
  const validPaths: Record<CiEnvironment, CiEnvironment[]> = {
    local: ['development', 'staging', 'production'],
    development: ['staging', 'production'],
    staging: ['production'],
    production: [],
  };

  // Check if path is valid
  const allowedTargets = validPaths[source] || [];
  const isValidPath = allowedTargets.includes(target);

  if (!isValidPath) {
    return {
      allowed: false,
      reason: `Invalid promotion path: ${source} -> ${target}`,
      source,
      target,
      requiresApproval: false,
    };
  }

  // Get environment settings
  const sourceSettings = ENVIRONMENT_SETTINGS[source];
  const targetSettings = ENVIRONMENT_SETTINGS[target];

  // Check if target requires approval
  const requiresApproval = targetSettings.requireApproval;

  // Check approval if required
  if (requiresApproval && !context?.approvedBy) {
    return {
      allowed: false,
      reason: 'Approval required for promotion to ' + target,
      source,
      target,
      requiresApproval: true,
      conditions: ['Requires approval from authorized personnel'],
    };
  }

  // Additional checks for production
  if (target === 'production') {
    if (!context?.version) {
      return {
        allowed: false,
        reason: 'Version required for production promotion',
        source,
        target,
        requiresApproval: true,
      };
    }

    // Check for staging deployment first
    if (source !== 'staging') {
      return {
        allowed: false,
        reason: 'Production promotion requires staging deployment first',
        source,
        target,
        requiresApproval: true,
        conditions: ['Must deploy to staging first'],
      };
    }
  }

  return {
    allowed: true,
    source,
    target,
    requiresApproval,
    approvedBy: context?.approvedBy,
    conditions: getPromotionConditions(source, target),
  };
}

/**
 * Enforce promotion policy
 */
export function enforcePromotionPolicy(
  decision: ReleasePromotionDecision
): {
  allowed: boolean;
  blocked: boolean;
  message: string;
} {
  if (!decision.allowed) {
    return {
      allowed: false,
      blocked: true,
      message: decision.reason || 'Promotion not allowed',
    };
  }

  if (decision.requiresApproval && !decision.approvedBy) {
    return {
      allowed: false,
      blocked: true,
      message: 'Promotion requires approval',
    };
  }

  return {
    allowed: true,
    blocked: false,
    message: 'Promotion allowed',
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get promotion conditions for a specific path
 */
function getPromotionConditions(source: CiEnvironment, target: CiEnvironment): string[] {
  const conditions: string[] = [];

  if (target === 'staging') {
    conditions.push('All CI quality gates must pass');
    conditions.push('Build artifacts must be available');
  }

  if (target === 'production') {
    conditions.push('All CI quality gates must pass');
    conditions.push('Staging deployment must be verified');
    conditions.push('Production approval required');
    conditions.push('Migration safety gates must pass');
  }

  return conditions;
}

/**
 * Get next environment in promotion chain
 */
export function getNextEnvironment(current: CiEnvironment): CiEnvironment | null {
  const promotionChain: Record<CiEnvironment, CiEnvironment | null> = {
    local: 'development',
    development: 'staging',
    staging: 'production',
    production: null,
  };

  return promotionChain[current];
}

/**
 * Get full promotion chain
 */
export function getPromotionChain(from: CiEnvironment, to: CiEnvironment): CiEnvironment[] {
  const chain: CiEnvironment[] = [from];

  let current = from;
  while (current !== to) {
    const next = getNextEnvironment(current);
    if (!next) break;
    chain.push(next);
    current = next;
  }

  return chain;
}
