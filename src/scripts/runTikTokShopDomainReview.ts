/**
 * Run TikTok Shop Domain Review
 *
 * Usage: npx tsx src/scripts/runTikTokShopDomainReview.ts
 */

import { buildTikTokShopDomainReadinessReport } from '../platform/tiktokShop/service/tiktokShopDomainService.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info({ msg: 'Starting TikTok Shop Domain Review' });

  try {
    const result = await buildTikTokShopDomainReadinessReport();

    console.log('\n=== TikTok Shop Domain Readiness Review ===');
    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Blockers: ${result.blockers}`);
    console.log(`Warnings: ${result.warnings}`);

    console.log('\nScores:');
    for (const [key, value] of Object.entries(result.score)) {
      console.log(`  ${key}: ${(value * 100).toFixed(0)}%`);
    }

    if (result.gaps.length > 0) {
      console.log('\nGaps:');
      result.gaps.forEach(gap => {
        console.log(`  [${gap.priority}] ${gap.gap}`);
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'TikTok Shop Domain Review Failed', error });
    process.exit(1);
  }
}

main();
