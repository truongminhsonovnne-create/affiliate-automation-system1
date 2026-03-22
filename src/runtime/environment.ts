/**
 * Runtime Layer - Environment Resolution
 * Resolves runtime environment and role
 */

import { v4 as uuidv4 } from 'uuid';
import type { RuntimeEnvironment, RuntimeRole, RuntimeProfile } from './types';
import { RUNTIME_ENVIRONMENTS, RUNTIME_ROLES } from './types';
import { VALID_ENVIRONMENTS, VALID_ROLES, REQUIRED_ENV_VARS } from './constants';

// =============================================================================
// RESOLUTION
// =============================================================================

/**
 * Resolve runtime environment from process.env
 */
export function resolveRuntimeEnvironment(): RuntimeEnvironment {
  const env = process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'local';

  // Normalize environment name
  const normalized = env.toLowerCase() as RuntimeEnvironment;

  if (!VALID_ENVIRONMENTS.includes(normalized)) {
    console.warn(`[Runtime] Unknown environment: ${env}, defaulting to 'local'`);
    return 'local';
  }

  return normalized;
}

/**
 * Resolve runtime role from process.env
 */
export function resolveRuntimeRole(): RuntimeRole {
  const role = process.env.RUNTIME_ROLE;

  if (!role) {
    throw new Error('[Runtime] RUNTIME_ROLE is required');
  }

  const normalized = role.toLowerCase() as RuntimeRole;

  if (!VALID_ROLES.includes(normalized)) {
    throw new Error(
      `[Runtime] Invalid RUNTIME_ROLE: ${role}. Valid roles: ${VALID_ROLES.join(', ')}`
    );
  }

  return normalized;
}

/**
 * Assert that runtime environment is supported
 */
export function assertSupportedRuntimeEnvironment(
  env: RuntimeEnvironment,
  supported: RuntimeEnvironment[] = ['local', 'development', 'staging', 'production']
): void {
  if (!supported.includes(env)) {
    throw new Error(
      `[Runtime] Environment '${env}' is not supported. Supported: ${supported.join(', ')}`
    );
  }
}

/**
 * Assert that runtime role is valid
 */
export function assertValidRuntimeRole(role: RuntimeRole): void {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(
      `[Runtime] Invalid role: ${role}. Valid roles: ${VALID_ROLES.join(', ')}`
    );
  }
}

// =============================================================================
// PROFILE BUILDING
// =============================================================================

/**
 * Build runtime profile
 */
export function buildRuntimeProfile(options?: {
  role?: RuntimeRole;
  environment?: RuntimeEnvironment;
  version?: string;
  instanceId?: string;
}): RuntimeProfile {
  const role = options?.role ?? resolveRuntimeRole();
  const environment = options?.environment ?? resolveRuntimeEnvironment();
  const version = options?.version ?? process.env.APP_VERSION ?? '0.0.0';
  const instanceId = options?.instanceId ?? process.env.INSTANCE_ID ?? uuidv4();

  return {
    role,
    environment,
    instanceId,
    version,
    startedAt: new Date(),
  };
}

// =============================================================================
// IDENTITY
// =============================================================================

/**
 * Get runtime identity
 */
export function getRuntimeIdentity(): {
  instanceId: string;
  role: RuntimeRole;
  environment: RuntimeEnvironment;
  version: string;
} {
  return {
    instanceId: process.env.INSTANCE_ID ?? uuidv4(),
    role: resolveRuntimeRole(),
    environment: resolveRuntimeEnvironment(),
    version: process.env.APP_VERSION ?? '0.0.0',
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return resolveRuntimeEnvironment() === 'production';
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return resolveRuntimeEnvironment() === 'staging';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return resolveRuntimeEnvironment() === 'development';
}

/**
 * Check if running locally
 */
export function isLocal(): boolean {
  return resolveRuntimeEnvironment() === 'local';
}

/**
 * Check if running as web role
 */
export function isWebRole(): boolean {
  try {
    return resolveRuntimeRole() === 'web';
  } catch {
    return false;
  }
}

/**
 * Check if running as worker role
 */
export function isWorkerRole(): boolean {
  try {
    const role = resolveRuntimeRole();
    return role.startsWith('worker-');
  } catch {
    return false;
  }
}

/**
 * Check if running as control plane
 */
export function isControlPlaneRole(): boolean {
  try {
    return resolveRuntimeRole() === 'control-plane';
  } catch {
    return false;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get current runtime environment (convenience wrapper)
 */
export function getRuntimeEnvironment(): RuntimeEnvironment {
  return resolveRuntimeEnvironment();
}

/**
 * Get current runtime role (convenience wrapper)
 */
export function getRuntimeRole(): RuntimeRole {
  return resolveRuntimeRole();
}
