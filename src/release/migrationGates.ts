/**
 * Migration Gates Module
 *
 * Models and executes migration safety gates for release automation.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  MigrationGateResult,
  MigrationGateSummary,
  MigrationGateOptions,
  CiEnvironment,
} from './types';
import {
  MIGRATION_RISK_ALLOWANCE,
  PRODUCTION_MIGRATION_RESTRICTIONS,
} from './constants';

const execAsync = promisify(exec);

// =============================================================================
// Migration Gate Execution
// =============================================================================

/**
 * Run migration gates
 */
export async function runMigrationGates(
  options?: Partial<MigrationGateOptions>
): Promise<MigrationGateSummary> {
  const environment = options?.environment || 'staging';
  const direction = options?.direction || 'up';
  const strict = options?.strict ?? (environment === 'production');

  // Get migrations to evaluate
  const migrations = await getPendingMigrations();

  if (migrations.length === 0) {
    return {
      totalMigrations: 0,
      passed: 0,
      failed: 0,
      risk: 'low',
      results: [],
      blocked: false,
    };
  }

  // Evaluate each migration
  const results: MigrationGateResult[] = [];
  for (const migration of migrations) {
    const result = await evaluateMigration(migration, strict);
    results.push(result);
  }

  return buildMigrationGateSummary(results, strict);
}

/**
 * Get pending migrations
 */
async function getPendingMigrations(): Promise<string[]> {
  const migrationsDir = 'supabase/migrations';

  try {
    const files = await fs.readdir(migrationsDir);
    return files
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => path.join(migrationsDir, f));
  } catch {
    return [];
  }
}

/**
 * Evaluate a single migration
 */
async function evaluateMigration(
  migrationPath: string,
  strict: boolean
): Promise<MigrationGateResult> {
  const content = await fs.readFile(migrationPath, 'utf-8');
  const filename = path.basename(migrationPath);

  // Detect dangerous operations
  const dangerousOps: string[] = [];

  if (/DROP\s+TABLE/i.test(content)) dangerousOps.push('DROP TABLE');
  if (/TRUNCATE/i.test(content)) dangerousOps.push('TRUNCATE');
  if (/ALTER\s+.*\s+DROP/i.test(content)) dangerousOps.push('DROP COLUMN');
  if (/DROP\s+INDEX/i.test(content)) dangerousOps.push('DROP INDEX');
  if (/DROP\s+VIEW/i.test(content)) dangerousOps.push('DROP VIEW');
  if (/DROP\s+FUNCTION/i.test(content)) dangerousOps.push('DROP FUNCTION');

  // Determine risk level
  let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (dangerousOps.length > 0) {
    risk = dangerousOps.some((op) =>
      MIGRATION_RISK_ALLOWANCE.critical.blocked?.includes(op)
    )
      ? 'critical'
      : 'high';
  } else if (/CREATE\s+TABLE/i.test(content)) {
    risk = 'medium';
  }

  // Check if rollbackable
  const rollbackable = /CREATE\s+TABLE/i.test(content) || /ALTER\s+TABLE.*ADD/i.test(content);

  // In strict mode, block anything with dangerous ops
  const passed = !strict || dangerousOps.length === 0;

  return {
    migration: filename,
    risk,
    passed,
    dangerousOps,
    rollbackable,
  };
}

/**
 * Build migration gate summary
 */
function buildMigrationGateSummary(
  results: MigrationGateResult[],
  strict: boolean
): MigrationGateSummary {
  const totalMigrations = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  // Determine overall risk
  const hasCritical = results.some((r) => r.risk === 'critical');
  const hasHigh = results.some((r) => r.risk === 'high');
  const hasMedium = results.some((r) => r.risk === 'medium');

  let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (hasCritical) risk = 'critical';
  else if (hasHigh) risk = 'high';
  else if (hasMedium) risk = 'medium';

  const blocked = strict && failed > 0;

  return {
    totalMigrations,
    passed,
    failed,
    risk,
    results,
    blocked,
  };
}

// =============================================================================
// Migration Risk Evaluation
// =============================================================================

/**
 * Evaluate migration risk
 */
export async function evaluateMigrationRisk(
  options?: Partial<MigrationGateOptions>
): Promise<{
  risk: 'low' | 'medium' | 'high' | 'critical';
  hasDangerousOps: boolean;
  migrations: string[];
}> {
  const environment = options?.environment || 'staging';
  const strict = environment === 'production';

  const migrations = await getPendingMigrations();
  let hasDangerousOps = false;
  let maxRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';

  for (const migrationPath of migrations) {
    const content = await fs.readFile(migrationPath, 'utf-8');

    if (/DROP\s+TABLE|TRUNCATE/i.test(content)) {
      hasDangerousOps = true;
      maxRisk = 'critical';
      break;
    }

    if (/ALTER\s+.*\s+DROP/i.test(content)) {
      hasDangerousOps = true;
      maxRisk = 'high';
    }
  }

  return {
    risk: maxRisk,
    hasDangerousOps,
    migrations,
  };
}

/**
 * Check if migration is allowed for release
 */
export async function isMigrationAllowedForRelease(
  options?: Partial<MigrationGateOptions>
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const environment = options?.environment || 'staging';
  const strict = options?.strict ?? (environment === 'production');

  if (!strict) {
    return { allowed: true };
  }

  const risk = await evaluateMigrationRisk({ environment, strict: true });

  if (risk.hasDangerousOps) {
    return {
      allowed: false,
      reason: 'Migration contains dangerous operations (DROP/TRUNCATE)',
    };
  }

  if (risk.risk === 'critical') {
    return {
      allowed: false,
      reason: 'Migration risk is critical',
    };
  }

  return { allowed: true };
}

// =============================================================================
// Summary Builders
// =============================================================================

/**
 * Build migration gate summary
 */
export function buildMigrationGateSummaryFromResults(
  results: MigrationGateResult[]
): MigrationGateSummary {
  return buildMigrationGateSummary(results, true);
}

/**
 * Get production migration restrictions
 */
export function getProductionMigrationRestrictions() {
  return PRODUCTION_MIGRATION_RESTRICTIONS;
}
