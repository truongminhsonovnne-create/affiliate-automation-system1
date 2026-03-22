/**
 * Release Verification Script
 *
 * Runs smoke tests and verification checks after deployment.
 * Validates that the system is operational in the target environment.
 *
 * Usage:
 *   npm run verify:release -- --env staging --url https://staging.affiliate.local
 *   npm run verify:release -- --env production --url https://affiliate.local
 */

import { getRuntimeEnvironment } from '../runtime/environment';
import { RuntimeEnvironment } from '../runtime/types';
import { runReleaseVerification } from '../runtime/release/releaseVerification';
import { logger } from '../runtime/utils/logger';

/**
 * Parse command line arguments
 */
interface VerificationOptions {
  environment: RuntimeEnvironment;
  url?: string;
  skipDatabaseCheck?: boolean;
  skipHealthCheck?: boolean;
  skipWorkerCheck?: boolean;
  timeout?: number;
}

function parseArgs(): VerificationOptions {
  const options: VerificationOptions = {
    environment: getRuntimeEnvironment(),
  };

  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--env':
      case '-e':
        if (nextArg && !nextArg.startsWith('--')) {
          options.environment = nextArg as RuntimeEnvironment;
          i++;
        }
        break;

      case '--url':
      case '-u':
        if (nextArg && !nextArg.startsWith('--')) {
          options.url = nextArg;
          i++;
        }
        break;

      case '--skip-db-check':
        options.skipDatabaseCheck = true;
        break;

      case '--skip-health-check':
        options.skipHealthCheck = true;
        break;

      case '--skip-worker-check':
        options.skipWorkerCheck = true;
        break;

      case '--timeout':
        if (nextArg && !nextArg.startsWith('--')) {
          options.timeout = parseInt(nextArg, 10) * 1000;
          i++;
        }
        break;

      case '--help':
      case '-h':
        displayHelp();
        process.exit(0);
    }
  }

  return options;
}

function displayHelp(): void {
  console.log(`
Affiliate Release Verification

Usage: npm run verify:release -- [OPTIONS]

Options:
  --env ENVIRONMENT        Environment to verify (local, development, staging, production)
  --url URL               Base URL for HTTP checks
  --skip-db-check        Skip database connectivity check
  --skip-health-check    Skip health endpoint checks
  --skip-worker-check    Skip worker boot verification
  --timeout SECONDS       Timeout for each check (default: 30)
  --help                 Show this help message

Examples:
  npm run verify:release -- --env staging --url https://staging.affiliate.local
  npm run verify:release -- --env production --url https://affiliate.local
`);
}

/**
 * Main verification execution
 */
async function execute(): Promise<void> {
  const options = parseArgs();

  console.log('');
  console.log('======================================');
  console.log('  Affiliate Release Verification');
  console.log('======================================');
  console.log('');
  console.log(`Environment: ${options.environment}`);
  console.log(`URL: ${options.url || 'not specified'}`);
  console.log('');

  try {
    const result = await runReleaseVerification({
      environment: options.environment,
      baseUrl: options.url,
      skipDatabaseCheck: options.skipDatabaseCheck,
      skipHealthCheck: options.skipHealthCheck,
      skipWorkerCheck: options.skipWorkerCheck,
      timeout: options.timeout || 30000,
    });

    console.log('');
    console.log('======================================');
    console.log('  Verification Results');
    console.log('======================================');
    console.log('');

    if (result.success) {
      console.log('✓ All verification checks passed');
      console.log('');
      console.log(`Checks passed: ${result.checksPassed}/${result.totalChecks}`);
      process.exit(0);
    } else {
      console.log('✗ Verification failed');
      console.log('');
      console.log(`Checks passed: ${result.checksPassed}/${result.totalChecks}`);
      console.log('');

      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        result.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }

      process.exit(1);
    }

  } catch (error) {
    logger.error('Release verification crashed', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('');
    console.log('✗ Verification crashed unexpectedly');
    process.exit(1);
  }
}

// Execute
execute();
