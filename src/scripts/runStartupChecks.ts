/**
 * Startup Checks Script
 *
 * Pre-flight validation before starting the runtime.
 * Validates dependencies, configuration, and environment readiness.
 *
 * Usage:
 *   npm run check:startup -- --role web --env local
 *   npm run check:startup -- --role worker-crawler --env staging
 */

import { bootstrapRuntime, BootstrapResult } from '../runtime/bootstrap/bootstrapRuntime';
import { runRoleDependencyChecks } from '../runtime/bootstrap/dependencyChecks';
import { RuntimeBootstrapOptions, RuntimeRole, RuntimeEnvironment } from '../runtime/types';
import { getRuntimeRole, getRuntimeEnvironment, resolveRuntimeRole } from '../runtime/environment';
import { loadRuntimeConfig } from '../runtime/config/runtimeConfig';
import { getRequiredEnvVars } from '../runtime/constants';
import { logger } from '../runtime/utils/logger';

/**
 * Parse command line arguments
 */
function parseArgs(): RuntimeBootstrapOptions {
  const options: RuntimeBootstrapOptions = {
    role: getRuntimeRole(),
    environment: getRuntimeEnvironment(),
  };

  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--role':
      case '-r':
        if (nextArg && !nextArg.startsWith('--')) {
          options.role = resolveRuntimeRole(nextArg);
          i++;
        }
        break;

      case '--env':
      case '-e':
        if (nextArg && !nextArg.startsWith('--')) {
          options.environment = nextArg as RuntimeEnvironment;
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
Affiliate Startup Checks

Usage: npm run check:startup -- [OPTIONS]

Options:
  --role, -r RUNTIME_ROLE   Role to validate (web, control-plane, worker-crawler, worker-ai, worker-publisher, ops-runner)
  --env, -e ENVIRONMENT     Environment to validate (local, development, staging, production)
  --help, -h              Show this help message

Examples:
  npm run check:startup -- --role web --env local
  npm run check:startup -- --role worker-crawler --env staging
`);
}

/**
 * Check for required environment variables
 */
function checkEnvironmentVariables(role: RuntimeRole, environment: RuntimeEnvironment): { valid: boolean; missing: string[] } {
  const required = getRequiredEnvVars(role, environment);
  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Display check results
 */
function displayResults(
  bootstrapResult: BootstrapResult,
  dependencyResult: { passed: boolean; details: string[] },
  envResult: { valid: boolean; missing: string[] }
): void {
  console.log('');
  console.log('======================================');
  console.log('  Startup Check Results');
  console.log('======================================');
  console.log('');

  // Bootstrap checks
  console.log('Bootstrap Checks:');
  if (bootstrapResult.success) {
    console.log('  ✓ All bootstrap checks passed');
  } else {
    console.log('  ✗ Bootstrap checks failed');
    bootstrapResult.errors.forEach((error) => {
      console.log(`    - ${error}`);
    });
  }
  console.log('');

  // Dependency checks
  console.log('Dependency Checks:');
  if (dependencyResult.passed) {
    console.log('  ✓ All dependencies available');
  } else {
    console.log('  ✗ Some dependencies unavailable');
  }
  dependencyResult.details.forEach((detail) => {
    console.log(`    - ${detail}`);
  });
  console.log('');

  // Environment variables
  console.log('Environment Variables:');
  if (envResult.valid) {
    console.log('  ✓ All required variables present');
  } else {
    console.log('  ✗ Missing required variables:');
    envResult.missing.forEach((varName) => {
      console.log(`    - ${varName}`);
    });
  }
  console.log('');

  // Overall result
  const allPassed = bootstrapResult.success && dependencyResult.passed && envResult.valid;

  console.log('======================================');
  if (allPassed) {
    console.log('  ✓ READY TO START');
  } else {
    console.log('  ✗ NOT READY TO START');
  }
  console.log('======================================');
}

/**
 * Main execution
 */
async function execute(): Promise<void> {
  const options = parseArgs();

  if (!options.role) {
    console.error('Error: Runtime role is required. Use --role flag or set RUNTIME_ROLE environment variable.');
    process.exit(1);
  }

  console.log('');
  console.log('======================================');
  console.log('  Affiliate Startup Checks');
  console.log('======================================');
  console.log('');
  console.log(`Role: ${options.role}`);
  console.log(`Environment: ${options.environment}`);
  console.log('');

  try {
    // Load configuration
    console.log('Loading configuration...');
    await loadRuntimeConfig(options);
    console.log('Configuration loaded');
    console.log('');

    // Run bootstrap checks
    console.log('Running bootstrap checks...');
    const bootstrapResult = await bootstrapRuntime(options);
    console.log('');

    // Run dependency checks
    console.log('Running dependency checks...');
    const dependencyResult = await runRoleDependencyChecks(options.role, options.environment);
    const details: string[] = [];

    if (dependencyResult.database) {
      details.push(`Database: ${dependencyResult.database.healthy ? 'available' : 'unavailable'}`);
    }
    if (dependencyResult.gemini) {
      details.push(`Gemini API: ${dependencyResult.gemini.available ? 'available' : 'unavailable'}`);
    }

    console.log('');

    // Check environment variables
    console.log('Checking environment variables...');
    const envResult = checkEnvironmentVariables(options.role, options.environment);
    console.log('');

    // Display results
    displayResults(bootstrapResult, { passed: dependencyResult.allHealthy, details }, envResult);

    // Exit with appropriate code
    const allPassed = bootstrapResult.success && dependencyResult.allHealthy && envResult.valid;
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    logger.error('Startup checks crashed', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('');
    console.log('✗ Startup checks crashed unexpectedly');
    process.exit(1);
  }
}

// Execute
execute();
