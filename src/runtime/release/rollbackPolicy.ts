/**
 * Runtime Layer - Rollback Policy
 * Rollback strategy definitions
 */

import type { RuntimeEnvironment } from '../types';

// =============================================================================
// ROLLBACK TYPES
// =============================================================================

/** Rollback risk levels */
export type RollbackRisk = 'low' | 'medium' | 'high' | 'critical';

/** Rollback plan */
export interface RollbackPlan {
  steps: RollbackStep[];
  estimatedDuration: number;
  risk: RollbackRisk;
  canRollback: boolean;
  notes: string[];
}

/** Rollback step */
export interface RollbackStep {
  order: number;
  action: string;
  target: string;
  rollbackCommand?: string;
}

// =============================================================================
// ROLLBACK POLICY
// =============================================================================

/**
 * Build rollback plan
 */
export function buildRollbackPlan(options?: {
  environment?: string;
  deploymentType?: 'app' | 'migration' | 'config';
}): RollbackPlan {
  const environment = options?.environment ?? process.env.NODE_ENV ?? 'local';
  const deploymentType = options?.deploymentType ?? 'app';

  const steps: RollbackStep[] = [];
  const notes: string[] = [];

  // App rollback steps
  if (deploymentType === 'app') {
    steps.push({
      order: 1,
      action: 'Stop current containers',
      target: 'docker-compose',
      rollbackCommand: 'docker-compose down',
    });

    steps.push({
      order: 2,
      action: 'Redeploy previous version',
      target: 'docker-compose',
      rollbackCommand: 'docker-compose up -d <previous-tag>',
    });

    steps.push({
      order: 3,
      action: 'Verify health',
      target: 'health endpoints',
    });

    notes.push('App rollback is straightforward - just redeploy previous image');
  }

  // Migration rollback steps
  if (deploymentType === 'migration') {
    steps.push({
      order: 1,
      action: 'STOP - Do not rollback without DBA approval',
      target: 'migration',
    });

    steps.push({
      order: 2,
      action: 'Contact DBA team',
      target: 'database',
    });

    steps.push({
      order: 3,
      action: 'Restore database from backup if needed',
      target: 'supabase',
    });

    notes.push('Migration rollback requires careful consideration');
    notes.push('Data may be lost if rollback is performed');
  }

  // Config rollback steps
  if (deploymentType === 'config') {
    steps.push({
      order: 1,
      action: 'Redeploy with previous config',
      target: 'docker-compose',
    });

    steps.push({
      order: 2,
      action: 'Verify configuration is applied',
      target: 'config',
    });
  }

  return {
    steps,
    estimatedDuration: deploymentType === 'migration' ? 30 : 5, // minutes
    risk: getRollbackRisk(environment, deploymentType),
    canRollback: canRollback(environment, deploymentType),
    notes,
  };
}

/**
 * Check if rollback is safe
 */
export function isRollbackSafe(options?: {
  environment?: string;
  deploymentType?: 'app' | 'migration' | 'config';
}): {
  safe: boolean;
  reasons: string[];
} {
  const environment = options?.environment ?? process.env.NODE_ENV ?? 'local';
  const deploymentType = options?.deploymentType ?? 'app';

  const reasons: string[] = [];

  // Production app rollback is safe
  if (environment === 'production' && deploymentType === 'app') {
    reasons.push('App rollback is safe in production');
    return { safe: true, reasons };
  }

  // Migration rollback in production is risky
  if (environment === 'production' && deploymentType === 'migration') {
    reasons.push('Migration rollback in production requires DBA approval');
    reasons.push('Data loss may occur');
    return { safe: false, reasons };
  }

  // Other environments are generally safe
  return { safe: true, reasons };
}

/**
 * Classify rollback risk
 */
export function classifyRollbackRisk(options?: {
  environment?: string;
  deploymentType?: 'app' | 'migration' | 'config';
}): RollbackRisk {
  const environment = options?.environment ?? process.env.NODE_ENV ?? 'local';
  const deploymentType = options?.deploymentType ?? 'app';

  // Production + migration = critical
  if (environment === 'production' && deploymentType === 'migration') {
    return 'critical';
  }

  // Production + app = medium
  if (environment === 'production' && deploymentType === 'app') {
    return 'medium';
  }

  // Staging + migration = high
  if (environment === 'staging' && deploymentType === 'migration') {
    return 'high';
  }

  // Other combinations = low
  return 'low';
}

// =============================================================================
// HELPERS
// =============================================================================

function getRollbackRisk(environment: string, deploymentType: string): RollbackRisk {
  return classifyRollbackRisk({ environment, deploymentType: deploymentType as any });
}

function canRollback(environment: string, deploymentType: string): boolean {
  // Migration in production cannot be safely rolled back
  if (environment === 'production' && deploymentType === 'migration') {
    return false;
  }

  return true;
}
