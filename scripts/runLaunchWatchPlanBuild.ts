/**
 * Run Launch Watch Plan Build
 */

import { getLogger } from '../utils/logger.js';
import { runPostLaunchWatchPreparation } from '../launchClosure/service/launchClosureService.js';

const logger = getLogger('run-launch-watch-plan-build');

async function main() {
  const args = process.argv.slice(2);
  const launchKey = args[0] || 'launch-demo';
  const watchWindowHours = parseInt(args[1]) || 168;

  logger.info('Building watch plan', { launchKey, watchWindowHours });

  try {
    const result = await runPostLaunchWatchPreparation(launchKey, watchWindowHours);

    console.log('\n=== Watch Plan Created ===\n');
    console.log(`Window: ${result.watchPlan.watchWindowStart?.toISOString()} to ${result.watchPlan.watchWindowEnd?.toISOString()}`);
    console.log(`Reviews: ${result.reviewPack.reviews.length}`);

    process.exit(0);
  } catch (error) {
    logger.error('Watch plan build failed', { error });
    process.exit(1);
  }
}

main();
