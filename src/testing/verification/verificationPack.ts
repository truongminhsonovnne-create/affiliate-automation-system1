/**
 * Verification Pack
 *
 * Provides verification pack functionality for staging pre-release validation.
 */

import type {
  VerificationPack,
  VerificationPackResult,
  VerificationPackItemResult,
  TestScenario,
  TestEnvironment,
} from '../types';
import { STAGING_VERIFICATION_TIME_BUDGET_MS } from '../constants';

/**
 * Create verification pack
 */
export function createVerificationPack(
  name: string,
  description: string,
  environment: TestEnvironment,
  scenarios: TestScenario[]
): VerificationPack {
  return {
    name,
    description,
    environment,
    scenarios,
    timeout: STAGING_VERIFICATION_TIME_BUDGET_MS,
    parallel: false,
  };
}

/**
 * Run verification pack
 */
export async function runVerificationPack(
  pack: VerificationPack,
  executor: (scenario: TestScenario) => Promise<boolean>
): Promise<VerificationPackResult> {
  const startTime = Date.now();
  const results: VerificationPackItemResult[] = [];
  const errors: string[] = [];

  console.log(`Starting verification pack: ${pack.name}`);
  console.log(`Running ${pack.scenarios.length} scenarios...`);

  for (const scenario of pack.scenarios) {
    const scenarioStart = Date.now();
    console.log(`  Running scenario: ${scenario.name}`);

    try {
      const passed = await executor(scenario);
      const duration = Date.now() - scenarioStart;

      results.push({
        scenario: scenario.name,
        passed,
        duration,
      });

      if (!passed) {
        errors.push(`Scenario '${scenario.name}' failed`);
      }
    } catch (error) {
      const duration = Date.now() - scenarioStart;
      const errorMessage = (error as Error).message;

      results.push({
        scenario: scenario.name,
        passed: false,
        duration,
        error: errorMessage,
      });

      errors.push(`Scenario '${scenario.name}' error: ${errorMessage}`);
    }
  }

  const duration = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const skippedCount = results.filter((r) => r.error?.includes('skipped')).length;

  console.log(`Verification pack '${pack.name}' completed in ${duration}ms`);
  console.log(`Passed: ${passedCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);

  return {
    pack: pack.name,
    passed: failedCount === 0,
    duration,
    executed: results.length,
    passedCount,
    failedCount,
    skippedCount,
    results,
    errors,
  };
}

/**
 * Staging pre-release verification pack
 */
export function createStagingVerificationPack(): VerificationPack {
  return createVerificationPack(
    'staging-prerelease',
    'Pre-release validation for staging environment',
    'staging',
    [
      {
        id: 'staging-health',
        name: 'Service Health Check',
        description: 'Verify all services are healthy',
        layer: 'smoke',
        tags: ['health', 'staging'],
        timeout: 30000,
      },
      {
        id: 'staging-database',
        name: 'Database Connectivity',
        description: 'Verify database connection',
        layer: 'integration',
        tags: ['database', 'staging'],
        timeout: 15000,
      },
      {
        id: 'staging-crawler',
        name: 'Crawler Functionality',
        description: 'Verify crawler can extract data',
        layer: 'integration',
        tags: ['crawler', 'staging'],
        timeout: 60000,
      },
      {
        id: 'staging-ai',
        name: 'AI Service',
        description: 'Verify AI enrichment works',
        layer: 'integration',
        tags: ['ai', 'staging'],
        timeout: 60000,
      },
      {
        id: 'staging-publishing',
        name: 'Publishing Service',
        description: 'Verify publishing pipeline',
        layer: 'workflow',
        tags: ['publishing', 'staging'],
        timeout: 120000,
      },
      {
        id: 'staging-regression',
        name: 'Regression Suite',
        description: 'Run core regression tests',
        layer: 'workflow',
        tags: ['regression', 'staging'],
        timeout: 300000,
      },
    ]
  );
}

/**
 * Quick smoke verification pack
 */
export function createQuickSmokePack(): VerificationPack {
  return createVerificationPack(
    'quick-smoke',
    'Quick smoke tests for deployment verification',
    'production',
    [
      {
        id: 'smoke-health',
        name: 'Health Check',
        description: 'Verify service is responding',
        layer: 'smoke',
        tags: ['health'],
        timeout: 10000,
      },
      {
        id: 'smoke-liveness',
        name: 'Liveness Check',
        description: 'Verify liveness endpoint',
        layer: 'smoke',
        tags: ['health'],
        timeout: 5000,
      },
    ]
  );
}

/**
 * Full smoke verification pack
 */
export function createFullSmokePack(): VerificationPack {
  return createVerificationPack(
    'full-smoke',
    'Full smoke tests including all integrations',
    'production',
    [
      {
        id: 'smoke-health',
        name: 'Health Check',
        description: 'Verify service is responding',
        layer: 'smoke',
        tags: ['health'],
        timeout: 10000,
      },
      {
        id: 'smoke-liveness',
        name: 'Liveness Check',
        description: 'Verify liveness endpoint',
        layer: 'smoke',
        tags: ['health'],
        timeout: 5000,
      },
      {
        id: 'smoke-readiness',
        name: 'Readiness Check',
        description: 'Verify readiness endpoint',
        layer: 'smoke',
        tags: ['health'],
        timeout: 15000,
      },
      {
        id: 'smoke-database',
        name: 'Database Check',
        description: 'Verify database connectivity',
        layer: 'smoke',
        tags: ['database'],
        timeout: 15000,
      },
    ]
  );
}

/**
 * Get pack by name
 */
export function getVerificationPack(name: string): VerificationPack | undefined {
  const packs: Record<string, () => VerificationPack> = {
    'staging-prerelease': createStagingVerificationPack,
    'quick-smoke': createQuickSmokePack,
    'full-smoke': createFullSmokePack,
  };

  const factory = packs[name];
  return factory ? factory() : undefined;
}

/**
 * List all verification packs
 */
export function listVerificationPacks(): VerificationPack[] {
  return [
    createStagingVerificationPack(),
    createQuickSmokePack(),
    createFullSmokePack(),
  ];
}
