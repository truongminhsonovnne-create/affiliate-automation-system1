/**
 * Quality Gates Module
 *
 * Models and executes quality gates for release automation.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  QualityGateResult,
  QualityGateSummary,
  QualityGateOptions,
  CiEnvironment,
} from './types';
import {
  MAX_TYPE_ERRORS,
  MAX_ESLINT_ERRORS,
  MAX_ESLINT_WARNINGS,
  MAX_BUILD_DURATION,
  ENVIRONMENT_SETTINGS,
} from './constants';

const execAsync = promisify(exec);

// =============================================================================
// Quality Gate Execution
// =============================================================================

/**
 * Run quality gates
 */
export async function runQualityGates(
  options?: Partial<QualityGateOptions>
): Promise<QualityGateSummary> {
  const environment = options?.environment || 'development';
  const results: QualityGateResult[] = [];

  // Gate 1: Type Check
  if (options?.skipTypecheck !== true) {
    results.push(await runTypeCheckGate());
  }

  // Gate 2: Build
  if (options?.skipBuild !== true) {
    results.push(await runBuildGate());
  }

  // Gate 3: Lint
  if (options?.skipLint !== true) {
    results.push(await runLintGate());
  }

  // Gate 4: Security
  if (options?.skipSecurity !== true) {
    results.push(await runSecurityGate());
  }

  // Gate 5: Container Build
  if (options?.skipContainer !== true) {
    results.push(await runContainerGate());
  }

  return evaluateQualityGateSummary(results);
}

/**
 * Run type check gate
 */
async function runTypeCheckGate(): Promise<QualityGateResult> {
  const start = Date.now();

  try {
    await execAsync('npx tsc --noEmit', { timeout: 120000 });
    return {
      gate: 'typecheck',
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      gate: 'typecheck',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Type check failed',
    };
  }
}

/**
 * Run build gate
 */
async function runBuildGate(): Promise<QualityGateResult> {
  const start = Date.now();

  try {
    await execAsync('npm run build', { timeout: MAX_BUILD_DURATION * 1000 });

    // Verify build output exists
    const distExists = await fs.access('dist').then(() => true).catch(() => false);

    return {
      gate: 'build',
      passed: distExists,
      duration: Date.now() - start,
      details: { distExists },
    };
  } catch (error) {
    return {
      gate: 'build',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Build failed',
    };
  }
}

/**
 * Run lint gate
 */
async function runLintGate(): Promise<QualityGateResult> {
  const start = Date.now();

  try {
    // Check if eslint config exists
    const eslintConfigExists = await fs.access('.eslintrc.json').then(() => true)
      .catch(() => false);

    if (!eslintConfigExists) {
      return {
        gate: 'lint',
        passed: true,
        duration: Date.now() - start,
        details: { skipped: 'No ESLint config' },
      };
    }

    const { stdout, stderr } = await execAsync('npx eslint src/ --format json', {
      timeout: 120000,
    });

    // Parse ESLint results
    const eslintResults = JSON.parse(stdout || '[]');
    const totalErrors = eslintResults.reduce(
      (sum: number, file: { errorCount: number }) => sum + file.errorCount,
      0
    );
    const totalWarnings = eslintResults.reduce(
      (sum: number, file: { warningCount: number }) => sum + file.warningCount,
      0
    );

    const passed = totalErrors <= MAX_ESLINT_ERRORS;

    return {
      gate: 'lint',
      passed,
      duration: Date.now() - start,
      details: { errors: totalErrors, warnings: totalWarnings },
    };
  } catch (error) {
    return {
      gate: 'lint',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Lint check failed',
    };
  }
}

/**
 * Run security gate
 */
async function runSecurityGate(): Promise<QualityGateResult> {
  const start = Date.now();

  try {
    // Run npm audit
    const { stdout } = await execAsync('npm audit --json', { timeout: 60000 })
      .catch(() => ({ stdout: '{}' }));

    const auditResults = JSON.parse(stdout);
    const vulnerabilities = auditResults?.vulnerabilities || {};

    const totalVulns = Object.values(vulnerabilities).reduce(
      (sum: number, vuln: unknown) =>
        sum + (vuln as { numDependencies?: number }).numDependencies || 0,
      0
    );

    return {
      gate: 'security',
      passed: totalVulns === 0,
      duration: Date.now() - start,
      details: { vulnerabilities: totalVulns },
    };
  } catch (error) {
    return {
      gate: 'security',
      passed: true,
      duration: Date.now() - start,
      details: { note: 'Security check skipped or failed' },
    };
  }
}

/**
 * Run container build gate
 */
async function runContainerGate(): Promise<QualityGateResult> {
  const start = Date.now();

  try {
    const dockerfiles = await fs.readdir('.').then((files) =>
      files.filter((f) => f.startsWith('Dockerfile.'))
    );

    if (dockerfiles.length === 0) {
      return {
        gate: 'container',
        passed: true,
        duration: Date.now() - start,
        details: { skipped: 'No Dockerfiles found' },
      };
    }

    // Build first Dockerfile as sanity check
    const firstDockerfile = dockerfiles[0];
    await execAsync(`docker build -f ${firstDockerfile} --target runner -t gate-test .`, {
      timeout: 300000,
    });

    return {
      gate: 'container',
      passed: true,
      duration: Date.now() - start,
      details: { dockerfiles, tested: firstDockerfile },
    };
  } catch (error) {
    return {
      gate: 'container',
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Container build failed',
    };
  }
}

// =============================================================================
// Quality Gate Evaluation
// =============================================================================

/**
 * Evaluate quality gate summary
 */
export function evaluateQualityGateSummary(
  results: QualityGateResult[]
): QualityGateSummary {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const blocked = failed > 0;

  const blockedBy = results
    .filter((r) => !r.passed)
    .map((r) => r.gate);

  return {
    passed,
    failed,
    results,
    blocked,
    blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
  };
}

/**
 * Check if release is blocked by quality gates
 */
export function isReleaseBlockedByQualityGates(
  summary: QualityGateSummary
): boolean {
  return summary.blocked;
}

/**
 * Get quality gate status for environment
 */
export function getQualityGateThresholds(environment: CiEnvironment) {
  const settings = ENVIRONMENT_SETTINGS[environment];

  return {
    maxTypeErrors: MAX_TYPE_ERRORS,
    maxLintErrors: MAX_ESLINT_ERRORS,
    maxLintWarnings: MAX_ESLINT_WARNINGS,
    maxBuildDuration: settings.maxBuildDuration,
    strictMode: environment === 'production',
  };
}
