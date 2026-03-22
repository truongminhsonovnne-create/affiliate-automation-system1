/**
 * Run Founder Cockpit Build
 *
 * CLI script to build founder cockpit snapshot.
 * Usage: npx tsx scripts/test/runFounderCockpitBuild.ts
 */

import { buildFounderCockpit } from '../../src/founderCockpit/service/founderCockpitService.js';
import { logger } from '../../src/utils/logger.js';

async function main(): Promise<void> {
  logger.info({ msg: 'Starting Founder Cockpit Build' });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  try {
    const startTime = Date.now();
    const cockpit = await buildFounderCockpit({ startDate, endDate });
    const duration = Date.now() - startTime;

    logger.info({
      msg: 'Founder Cockpit Built Successfully',
      duration,
      cockpitId: cockpit.id,
      healthScore: cockpit.healthScore,
    });

    console.log('\n=== Founder Cockpit Build Results ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Cockpit ID: ${cockpit.id}`);
    console.log(`Overall Health: ${cockpit.overallHealth}`);
    console.log(`Health Score: ${cockpit.healthScore}`);
    console.log(`Sections: ${cockpit.sections.length}`);
    console.log(`Top Risks: ${cockpit.topRisks.length}`);
    console.log(`Top Wins: ${cockpit.topWins.length}`);

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Founder Cockpit Build Failed', error });
    console.error('\n!!! Founder Cockpit Build Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
