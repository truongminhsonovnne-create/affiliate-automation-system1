/**
 * Run Launch Go/No-Go Check
 */

import { getLogger } from '../utils/logger.js';
import { buildLaunchClosureDecisionSupport } from '../launchClosure/service/launchClosureService.js';
import { buildGoNoGoExplanation } from '../launchClosure/readiness/goNoGoDecisionService.js';

const logger = getLogger('run-launch-go-no-go-check');

async function main() {
  const args = process.argv.slice(2);
  const launchKey = args[0] || 'launch-demo';

  logger.info('Running go/no-go check', { launchKey });

  try {
    const result = await buildLaunchClosureDecisionSupport({ launchKey });

    console.log('\n' + buildGoNoGoExplanation(result.goNoGo));

    process.exit(result.goNoGo.decision === 'go' ? 0 : 1);
  } catch (error) {
    logger.error('Go/No-Go check failed', { error });
    process.exit(1);
  }
}

main();
