/**
 * Run Strategic Review Pack Build
 *
 * CLI script to build strategic review pack.
 * Usage: npx tsx scripts/test/runStrategicReviewBuild.ts --type monthly
 */

import { buildStrategicReviewAutomationPack } from '../../src/founderCockpit/service/founderCockpitService.js';
import { logger } from '../../src/utils/logger.js';

interface Args {
  type: string;
  days: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type='));
  const daysArg = args.find(a => a.startsWith('--days='));

  return {
    type: typeArg?.split('=')[1] || 'monthly',
    days: daysArg ? parseInt(daysArg.split('=')[1], 10) : 30,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  logger.info({ msg: 'Starting Strategic Review Pack Build', type: args.type, days: args.days });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - args.days * 24 * 60 * 60 * 1000);

  try {
    const startTime = Date.now();
    const pack = await buildStrategicReviewAutomationPack({
      type: args.type,
      startDate,
      endDate,
    });
    const duration = Date.now() - startTime;

    logger.info({
      msg: 'Strategic Review Pack Built Successfully',
      duration,
      packId: pack.id,
      reviewType: pack.reviewType,
    });

    console.log('\n=== Strategic Review Pack Build Results ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Pack ID: ${pack.id}`);
    console.log(`Review Type: ${pack.reviewType}`);
    console.log(`Status: ${pack.status}`);
    console.log(`Period: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    console.log(`Overall Health: ${pack.summary.overallHealth}`);
    console.log(`Health Score: ${pack.summary.overallScore}`);
    console.log(`Findings: ${pack.findings.length}`);
    console.log(`Recommendations: ${pack.recommendations.length}`);

    if (pack.findings.length > 0) {
      console.log('\nKey Findings:');
      pack.findings.forEach(f => {
        console.log(`  - [${f.severity}] ${f.title}`);
      });
    }

    if (pack.recommendations.length > 0) {
      console.log('\nRecommendations:');
      pack.recommendations.forEach(r => {
        console.log(`  - [${r.priority}] ${r.recommendation}`);
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Strategic Review Pack Build Failed', error });
    console.error('\n!!! Strategic Review Pack Build Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
