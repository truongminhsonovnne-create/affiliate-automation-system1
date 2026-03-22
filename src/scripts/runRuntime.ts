/**
 * Runtime Startup Script
 *
 * CLI entry point for starting the Affiliate runtime.
 * Supports multiple roles and environments.
 *
 * Usage:
 *   npm run runtime -- --role web --env local
 *   npm run runtime -- --role worker-crawler --env staging
 *   npm run runtime -- --role control-plane --env production
 */

import { main } from '../runtime/process/entrypoints';
import { logger } from '../runtime/utils/logger';
import { getRuntimeRole, getRuntimeEnvironment } from '../runtime/environment';

/**
 * Enhanced argument parsing with npm run support
 */
function parseArgs(): string[] {
  const args: string[] = [process.execPath, 'runRuntime.ts'];

  // Check for npm run style arguments (-- followed by option)
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    // Handle npm run style: --role=web or --role web
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex > 0) {
        // Format: --role=web
        args.push(arg.substring(0, equalIndex));
        args.push(arg.substring(equalIndex + 1));
      } else {
        // Format: --role web
        args.push(arg);
        const nextArg = process.argv[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          args.push(nextArg);
          i++;
        }
      }
    } else if (!arg.startsWith('-')) {
      // Positional argument
      args.push(arg);
    }
  }

  return args;
}

/**
 * Main execution
 */
async function execute(): Promise<void> {
  try {
    // Set process title
    process.title = 'affiliate-runtime';

    // Log startup
    const role = getRuntimeRole();
    const env = getRuntimeEnvironment();
    logger.info('Affiliate Runtime starting', { role, env, pid: process.pid });

    // Parse and execute
    const args = parseArgs();
    await main(args);

  } catch (error) {
    logger.error('Runtime startup failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Execute if run directly
execute();
