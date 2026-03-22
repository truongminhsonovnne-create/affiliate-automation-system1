/**
 * Security Layer - Environment Policies
 * Policy enforcement based on environment
 */

import type { SecurityCheckResult } from '../types';
import { getPublicSafeConfig } from '../config/secureEnv';

// =============================================================================
// ENVIRONMENT TYPES
// =============================================================================

export type Environment = 'local' | 'development' | 'staging' | 'production';

// =============================================================================
// ENVIRONMENT CHECKS
// =============================================================================

/**
 * Get current environment
 */
export function getCurrentEnvironment(): Environment {
  const config = getPublicSafeConfig();
  const nodeEnv = config.NODE_ENV ?? 'development';

  switch (nodeEnv) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    case 'development':
      return 'development';
    default:
      return 'local';
  }
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return getCurrentEnvironment() === 'staging';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Check if running locally
 */
export function isLocal(): boolean {
  return getCurrentEnvironment() === 'local';
}

// =============================================================================
// OPERATION RESTRICTIONS
// =============================================================================

/** Operations restricted by environment */
const ENVIRONMENT_RESTRICTIONS: Record<Environment, Set<string>> = {
  local: new Set(),
  development: new Set(),
  staging: new Set([
    'SECRET_MANAGE',
    'USER_MANAGE',
    'CONFIG_UPDATE',
  ]),
  production: new Set([
    'SECRET_MANAGE',
    'USER_MANAGE',
    'CONFIG_UPDATE',
    'DIRECT_DATABASE_WRITE',
    'DEBUG_MODE',
  ]),
};

/**
 * Check if operation is allowed in current environment
 */
export function isOperationAllowedInEnvironment(
  operation: string,
  env?: Environment,
  context?: { actorRole?: string }
): boolean {
  const environment = env ?? getCurrentEnvironment();
  const restrictions = ENVIRONMENT_RESTRICTIONS[environment];

  if (restrictions.has(operation)) {
    // Check if actor has elevated permissions
    if (context?.actorRole === 'super_admin') {
      return environment !== 'production'; // Super admin can bypass except in prod
    }
    return false;
  }

  return true;
}

/**
 * Enforce environment security policy
 */
export function enforceEnvironmentSecurityPolicy(
  operation: string,
  env?: Environment,
  context?: { actorRole?: string }
): SecurityCheckResult {
  const allowed = isOperationAllowedInEnvironment(operation, env, context);

  if (!allowed) {
    const environment = env ?? getCurrentEnvironment();
    return {
      passed: false,
      reason: `Operation '${operation}' is not allowed in ${environment} environment`,
    };
  }

  return { passed: true };
}

// =============================================================================
// ENVIRONMENT-SPECIFIC POLICIES
// =============================================================================

/**
 * Get security policy for environment
 */
export function getEnvironmentSecurityPolicy(env: Environment): {
  /** Require authentication */
  requireAuth: boolean;

  /** Require MFA */
  requireMfa: boolean;

  /** Allow debug features */
  allowDebug: boolean;

  /** Allow verbose logging */
  allowVerboseLogging: boolean;

  /** Rate limit multiplier */
  rateLimitMultiplier: number;

  /** Session TTL in minutes */
  sessionTTLMinutes: number;

  /** Token TTL in minutes */
  tokenTTLMinutes: number;

  /** Max failed auth attempts */
  maxFailedAuthAttempts: number;

  /** Lockout duration in minutes */
  lockoutDurationMinutes: number;
} {
  switch (env) {
    case 'production':
      return {
        requireAuth: true,
        requireMfa: true,
        allowDebug: false,
        allowVerboseLogging: false,
        rateLimitMultiplier: 1,
        sessionTTLMinutes: 480, // 8 hours
        tokenTTLMinutes: 30,
        maxFailedAuthAttempts: 3,
        lockoutDurationMinutes: 60,
      };

    case 'staging':
      return {
        requireAuth: true,
        requireMfa: false,
        allowDebug: false,
        allowVerboseLogging: true,
        rateLimitMultiplier: 2,
        sessionTTLMinutes: 720, // 12 hours
        tokenTTLMinutes: 60,
        maxFailedAuthAttempts: 5,
        lockoutDurationMinutes: 30,
      };

    case 'development':
      return {
        requireAuth: false,
        requireMfa: false,
        allowDebug: true,
        allowVerboseLogging: true,
        rateLimitMultiplier: 10,
        sessionTTLMinutes: 1440, // 24 hours
        tokenTTLMinutes: 240, // 4 hours
        maxFailedAuthAttempts: 10,
        lockoutDurationMinutes: 15,
      };

    case 'local':
    default:
      return {
        requireAuth: false,
        requireMfa: false,
        allowDebug: true,
        allowVerboseLogging: true,
        rateLimitMultiplier: 100,
        sessionTTLMinutes: 10080, // 7 days
        tokenTTLMinutes: 1440, // 24 hours
        maxFailedAuthAttempts: 20,
        lockoutDurationMinutes: 5,
      };
  }
}

/**
 * Get policy for current environment
 */
export function getCurrentEnvironmentPolicy() {
  return getEnvironmentSecurityPolicy(getCurrentEnvironment());
}

// =============================================================================
// DRY-RUN POLICIES
// =============================================================================

/**
 * Default dry-run behavior by environment
 */
export function getDefaultDryRunPolicy(): boolean {
  const env = getCurrentEnvironment();

  switch (env) {
    case 'production':
      return false; // Never default to dry-run in prod
    case 'staging':
      return false;
    case 'development':
      return true;
    case 'local':
    default:
      return true;
  }
}

/**
 * Can run in production mode
 */
export function canRunProductionMode(operation: string): boolean {
  const env = getCurrentEnvironment();

  if (env === 'production') {
    // Most operations require careful consideration in prod
    return operation === 'CRAWLER_EXECUTE' || operation === 'AI_ENRICHMENT';
  }

  return true;
}
