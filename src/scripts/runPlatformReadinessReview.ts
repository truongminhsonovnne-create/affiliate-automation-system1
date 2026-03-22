/**
 * Run Platform Readiness Review
 *
 * CLI script to run readiness review for a platform.
 * Usage: npx tsx src/scripts/runPlatformReadinessReview.ts --platform=tiktok_shop --type=initial
 */

import { runPlatformReadinessReview } from '../platform/service/multiPlatformFoundationService.js';
import { logger } from '../utils/logger.js';

interface Args {
  platform: string;
  type: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const platformArg = args.find(a => a.startsWith('--platform='));
  const typeArg = args.find(a => a.startsWith('--type='));

  return {
    platform: platformArg?.split('=')[1] || 'tiktok_shop',
    type: typeArg?.split('=')[1] || 'initial',
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  logger.info({ msg: 'Starting Platform Readiness Review', platform: args.platform, type: args.type });

  try {
    const startTime = Date.now();
    const result = await runPlatformReadinessReview(args.platform, args.type as any);
    const duration = Date.now() - startTime;

    logger.info({
      msg: 'Platform Readiness Review Completed',
      duration,
      platform: args.platform,
      status: result.status,
      score: result.score.overall,
    });

    console.log('\n=== Platform Readiness Review Results ===');
    console.log(`Platform: ${args.platform}`);
    console.log(`Review Type: ${args.type}`);
    console.log(`Status: ${result.status}`);
    console.log(`Score: ${(result.score.overall * 100).toFixed(0)}%`);
    console.log(`Blockers: ${result.blockers}`);
    console.log(`Warnings: ${result.warnings}`);
    console.log(`Duration: ${duration}ms`);

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Platform Readiness Review Failed', error });
    console.error('\n!!! Platform Readiness Review Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
