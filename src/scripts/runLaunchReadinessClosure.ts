/**
 * Run Launch Readiness Closure
 * CLI script to execute launch readiness closure
 */

import { getLogger } from '../utils/logger.js';
import { runLaunchReadinessClosure } from '../launchClosure/service/launchClosureService.js';
import { generateDefaultLaunchKey } from '../launchClosure/constants.js';

const logger = getLogger('run-launch-readiness-closure');

interface CliArgs {
  launchKey?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {};

  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--verbose' || arg === '-v') result.verbose = true;
    else if (arg.startsWith('--key=')) result.launchKey = arg.split('=')[1];
  }

  return result;
}

async function main() {
  const args = parseArgs();
  const launchKey = args.launchKey ?? generateDefaultLaunchKey();

  logger.info('Starting launch readiness closure', { launchKey });

  const startTime = Date.now();

  try {
    if (args.dryRun) {
      console.log('\n=== DRY RUN MODE ===\n');
      console.log(`Would run closure for: ${launchKey}`);
      return;
    }

    const result = await runLaunchReadinessClosure({ launchKey });

    const duration = Date.now() - startTime;

    console.log('\n=== Launch Readiness Closure Complete ===\n');
    console.log(`Duration: ${duration}ms`);
    console.log(`Launch Key: ${launchKey}`);
    console.log(`Decision: ${result.closureReport.goNoGoDecision.decision.toUpperCase()}`);
    console.log(`Readiness Score: ${Math.round(result.closureReport.readinessScore * 100)}%`);
    console.log(`Blockers: ${result.closureReport.goNoGoDecision.blockerCount}`);
    console.log(`Warnings: ${result.closureReport.goNoGoDecision.warningCount}`);
    console.log(`\nRationale: ${result.closureReport.goNoGoDecision.rationale}`);

    logger.info('Launch readiness closure completed', { launchKey, duration, decision: result.closureReport.goNoGoDecision.decision });

    process.exit(0);
  } catch (error) {
    logger.error('Launch readiness closure failed', { launchKey, error });
    console.error('\n=== FAILED ===\n', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
