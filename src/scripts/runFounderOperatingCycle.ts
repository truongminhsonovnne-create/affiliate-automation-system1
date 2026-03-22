/**
 * Run Founder Operating Cycle
 *
 * CLI script to execute the full founder operating cycle including:
 * - Founder cockpit build
 * - Weekly operating review
 * - Strategic review automation
 */

import { runFounderOperatingCycle } from '../founderCockpit/service/founderCockpitService.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  logger.info({ msg: 'Starting Founder Operating Cycle' });

  try {
    const startTime = Date.now();
    const result = await runFounderOperatingCycle();
    const duration = Date.now() - startTime;

    logger.info({
      msg: 'Founder Operating Cycle Completed',
      duration,
      cockpitId: result.cockpit.id,
    });

    console.log('\n=== Founder Operating Cycle Results ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Cockpit ID: ${result.cockpit.id}`);
    console.log(`Overall Health: ${result.cockpit.overallHealth}`);
    console.log(`Health Score: ${result.cockpit.healthScore}`);

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Founder Operating Cycle Failed', error });
    console.error('\n!!! Founder Operating Cycle Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
