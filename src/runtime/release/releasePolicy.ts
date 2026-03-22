/**
 * Runtime Layer - Release Policy
 * Release policy definitions
 */

import type { RuntimeEnvironment } from '../types';

// =============================================================================
// RELEASE POLICY
// =============================================================================

/** Release policy for an environment */
export interface ReleasePolicy {
  allowDeploy: boolean;
  allowMigration: boolean;
  requireManualApproval: boolean;
  dryRunDefault: boolean;
  rollbackEnabled: boolean;
  smokeTestRequired: boolean;
  healthCheckRequired: boolean;
}

/**
 * Get release policy for environment
 */
export function getReleasePolicy(
  env: RuntimeEnvironment,
  options?: {
    deploymentType?: 'app' | 'migration' | 'config';
  }
): ReleasePolicy {
  const deploymentType = options?.deploymentType ?? 'app';

  switch (env) {
    case 'local':
      return {
        allowDeploy: true,
        allowMigration: true,
        requireManualApproval: false,
        dryRunDefault: true,
        rollbackEnabled: true,
        smokeTestRequired: false,
        healthCheckRequired: false,
      };

    case 'development':
      return {
        allowDeploy: true,
        allowMigration: true,
        requireManualApproval: false,
        dryRunDefault: true,
        rollbackEnabled: true,
        smokeTestRequired: false,
        healthCheckRequired: false,
      };

    case 'staging':
      return {
        allowDeploy: true,
        allowMigration: true,
        requireManualApproval: false,
        dryRunDefault: true,
        rollbackEnabled: true,
        smokeTestRequired: true,
        healthCheckRequired: true,
      };

    case 'production':
      return {
        allowDeploy: deploymentType === 'config',
        allowMigration: deploymentType === 'migration' && false, // Always false for production
        requireManualApproval: true,
        dryRunDefault: false,
        rollbackEnabled: true,
        smokeTestRequired: true,
        healthCheckRequired: true,
      };

    default:
      return {
        allowDeploy: false,
        allowMigration: false,
        requireManualApproval: true,
        dryRunDefault: true,
        rollbackEnabled: false,
        smokeTestRequired: true,
        healthCheckRequired: true,
      };
  }
}

// =============================================================================
// MIGRATION POLICY
// =============================================================================

/**
 * Check if migration is allowed for environment
 */
export function isMigrationAllowedForEnvironment(
  env: RuntimeEnvironment,
  options?: {
    migrationType?: 'schema' | 'data' | 'both';
  }
): boolean {
  const policy = getReleasePolicy(env, { deploymentType: 'migration' });

  if (!policy.allowMigration) {
    return false;
  }

  // Stricter for production
  if (env === 'production') {
    // Only allow schema migrations with explicit approval
    return options?.migrationType === 'schema' ? true : false;
  }

  return true;
}

/**
 * Check if deploy is allowed for environment
 */
export function isDeployAllowedForEnvironment(
  env: RuntimeEnvironment,
  options?: {
    deploymentType?: 'app' | 'migration' | 'config';
  }
): boolean {
  const policy = getReleasePolicy(env, options);
  return policy.allowDeploy;
}

// =============================================================================
// APPROVAL
// =============================================================================

/**
 * Check if manual approval is required
 */
export function requiresManualApproval(
  env: RuntimeEnvironment,
  stage?: 'build' | 'deploy' | 'verify'
): boolean {
  if (env === 'production') {
    return true;
  }

  if (env === 'staging' && stage === 'deploy') {
    return true;
  }

  return false;
}

/**
 * Get approval requirements
 */
export function getApprovalRequirements(
  env: RuntimeEnvironment
): {
  requiresApproval: boolean;
  approvers: string[];
  notificationChannels: string[];
} {
  switch (env) {
    case 'production':
      return {
        requiresApproval: true,
        approvers: ['engineering-lead', 'security-team'],
        notificationChannels: ['#engineering', '#releases'],
      };

    case 'staging':
      return {
        requiresApproval: true,
        approvers: ['team-lead'],
        notificationChannels: ['#engineering'],
      };

    default:
      return {
        requiresApproval: false,
        approvers: [],
        notificationChannels: [],
      };
  }
}
