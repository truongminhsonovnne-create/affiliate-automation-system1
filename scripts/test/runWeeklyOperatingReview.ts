/**
 * Run Weekly Operating Review
 *
 * CLI script to build weekly operating review.
 * Usage: npx tsx scripts/test/runWeeklyOperatingReview.ts
 */

import { buildWeeklyOperatingRhythm } from '../../src/founderCockpit/service/founderCockpitService.js';
import { logger } from '../../src/utils/logger.js';

async function main(): Promise<void> {
  logger.info({ msg: 'Starting Weekly Operating Review Build' });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  try {
    const startTime = Date.now();
    const review = await buildWeeklyOperatingRhythm({ startDate, endDate });
    const duration = Date.now() - startTime;

    logger.info({
      msg: 'Weekly Operating Review Built Successfully',
      duration,
      reviewId: review.id,
      reviewKey: review.reviewKey,
    });

    console.log('\n=== Weekly Operating Review Results ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Review ID: ${review.id}`);
    console.log(`Review Key: ${review.reviewKey}`);
    console.log(`Status: ${review.status}`);
    console.log(`Overall Health: ${review.summary.overallHealth}`);
    console.log(`Health Score: ${review.summary.overallScore}`);
    console.log(`\nKey Changes:`);
    review.summary.keyChanges.forEach(change => {
      console.log(`  - ${change.metric}: ${change.changePercent > 0 ? '+' : ''}${change.changePercent.toFixed(1)}% (${change.trend})`);
    });
    console.log(`\nRisk Areas: ${review.summary.riskAreas.length}`);
    review.summary.riskAreas.forEach(r => console.log(`  - ${r}`));
    console.log(`\nWin Areas: ${review.summary.winAreas.length}`);
    review.summary.winAreas.forEach(w => console.log(`  - ${w}`));
    console.log(`\nBlockers: ${review.blockers.length}`);
    review.blockers.forEach(b => console.log(`  - [${b.severity}] ${b.title}`));
    console.log(`\nPriorities: ${review.priorities.length}`);
    review.priorities.forEach(p => console.log(`  - [${p.priority}] ${p.title}`));

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Weekly Operating Review Build Failed', error });
    console.error('\n!!! Weekly Operating Review Build Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
