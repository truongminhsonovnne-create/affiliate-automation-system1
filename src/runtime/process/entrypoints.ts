/**
 * Runtime Process Entry Points
 *
 * Central entry points for each runtime role.
 * Handles process initialization, argument parsing, and role-specific bootstrapping.
 */

import { bootstrapRuntime } from '../bootstrap/bootstrapRuntime';
import { RuntimeRole, RuntimeEnvironment, RuntimeBootstrapOptions } from '../types';
import { resolveRuntimeEnvironment, resolveRuntimeRole } from '../environment';
import { loadRuntimeConfig } from '../config/runtimeConfig';
import { registerGracefulShutdownHandlers } from '../shutdown/gracefulShutdown';
import { logger } from '../utils/logger';

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

/**
 * Parse command line arguments for runtime options
 */
export function parseRuntimeArgs(argv: string[]): RuntimeBootstrapOptions {
  const options: RuntimeBootstrapOptions = {
    role: resolveRuntimeRole(),
    environment: resolveRuntimeEnvironment(),
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];

    switch (arg) {
      case '--role':
      case '-r':
        if (nextArg && !nextArg.startsWith('--')) {
          options.role = nextArg as RuntimeRole;
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
    }
  }

  return options;
}

/**
 * Display help message for runtime entrypoint
 */
export function displayRuntimeHelp(): void {
  console.log(`
Affiliate Runtime Entry Point

Usage: node dist/runtime/process/entrypoints.js [OPTIONS]

Options:
  --role, -r RUNTIME_ROLE    Runtime role to start
                             Valid: web, control-plane, worker-crawler, worker-ai, worker-publisher, ops-runner
  --env, -e ENVIRONMENT      Environment to run in
                             Valid: local, development, staging, production

Examples:
  node dist/runtime/process/entrypoints.js --role web --env development
  node dist/runtime/process/entrypoints.js --role worker-crawler --env staging
`);
}

/**
 * Main runtime entry point
 *
 * This is the primary entry point for all runtime processes.
 * It parses arguments, bootstraps the runtime, and starts the appropriate role.
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  // Parse command line arguments
  const options = parseRuntimeArgs(argv);

  // Validate role
  if (!options.role) {
    console.error('Error: Runtime role is required. Use --role flag or set RUNTIME_ROLE environment variable.');
    process.exit(1);
  }

  try {
    // Load runtime configuration
    loadRuntimeConfig(options.role, options.environment);
    logger.info('Runtime configuration loaded', {
      role: options.role,
      environment: options.environment
    });

    // Bootstrap the runtime
    const bootstrapResult = await bootstrapRuntime(options);

    if (!bootstrapResult.success) {
      logger.error('Runtime bootstrap failed', { errors: bootstrapResult.errors });
      process.exit(1);
    }

    logger.info('Runtime bootstrap complete', {
      role: options.role,
      environment: options.environment,
      checksPassed: bootstrapResult.checksPassed
    });

    // Start HTTP server for roles that require it
    if (options.role === 'control-plane') {
      const { startServer, setupGracefulShutdown } = await import('../../controlPlane/http/server.js');
      const { server } = await startServer();
      setupGracefulShutdown(server);
      logger.info('Control plane HTTP server started');
    }

    // Register graceful shutdown handlers
    registerGracefulShutdownHandlers({
      onShutdown: async (reason) => {
        logger.info('Shutting down runtime', { reason });
      },
    });

  } catch (error) {
    logger.error('Fatal runtime error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      role: options.role,
      environment: options.environment
    });
    process.exit(1);
  }
}

/**
 * Web runtime entry point
 */
export async function startWebEntry(): Promise<void> {
  await bootstrapRuntime({ role: 'web', environment: resolveRuntimeEnvironment() });
  registerGracefulShutdownHandlers({
    onShutdown: async (reason) => {
      console.log(`Web shutting down: ${reason}`);
    },
  });
  console.log('Web runtime started');
}

/**
 * Control plane entry point
 */
export async function startControlPlaneEntry(): Promise<void> {
  await bootstrapRuntime({ role: 'control-plane', environment: resolveRuntimeEnvironment() });

  const { startServer, setupGracefulShutdown } = await import('../../controlPlane/http/server.js');
  const { server } = await startServer();
  setupGracefulShutdown(server);

  console.log('Control plane runtime started');
}

/**
 * Worker entry point - dispatches to specific worker type based on RUNTIME_ROLE
 */
export async function startWorkerEntry(): Promise<void> {
  const role = resolveRuntimeRole();
  const environment = resolveRuntimeEnvironment();

  await bootstrapRuntime({ role, environment });
  registerGracefulShutdownHandlers({
    onShutdown: async (reason) => {
      console.log(`Worker shutting down: ${reason}`);
    },
  });

  console.log(`Worker started: ${role}`);
}

// Export stubs for startRuntimeForRole
export async function startRuntimeForRole(role: RuntimeRole, environment: RuntimeEnvironment): Promise<void> {
  console.log(`Starting runtime for role: ${role}, env: ${environment}`);
}
