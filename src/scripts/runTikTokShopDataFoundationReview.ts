/**
 * TikTok Shop Data Foundation Review CLI Script
 * Runs the full data foundation review for TikTok Shop
 */

import { runTikTokShopDataFoundationReview, buildTikTokShopDataDecisionSupport } from '../platform/tiktokShop/data/service/tiktokShopDataFoundationService.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info({ msg: 'Starting TikTok Shop Data Foundation Review' });

  try {
    // Run full review
    const review = await runTikTokShopDataFoundationReview();

    console.log('\n===========================================');
    console.log('TIKTOK SHOP DATA FOUNDATION REVIEW');
    console.log('===========================================\n');

    // Sources summary
    console.log('SOURCES:');
    console.log('--------');
    for (const source of review.sources) {
      console.log(`  ${source.sourceKey}:`);
      console.log(`    Type: ${source.sourceType}`);
      console.log(`    Support Level: ${source.supportLevel}`);
      console.log(`    Health: ${source.healthStatus}`);
      console.log(`    Readiness: ${source.readinessStatus}`);
    }

    console.log('\nACQUISITION:');
    console.log('------------');
    console.log(`  Total Runs: ${review.acquisition.totalRuns}`);
    console.log(`  Successful: ${review.acquisition.successfulRuns}`);
    console.log(`  Failed: ${review.acquisition.failedRuns}`);
    console.log(`  Items Seen: ${review.acquisition.totalItemsSeen}`);
    console.log(`  Items Normalized: ${review.acquisition.totalItemsNormalized}`);
    console.log(`  Items Enriched: ${review.acquisition.totalItemsEnriched}`);

    console.log('\nREADINESS:');
    console.log('----------');
    console.log(`  Overall Score: ${(review.readiness.overallScore * 100).toFixed(0)}%`);
    console.log(`  Status: ${review.readiness.readinessStatus}`);
    console.log(`  Context Score: ${(review.readiness.contextScore * 100).toFixed(0)}%`);
    console.log(`  Promotion Source Score: ${(review.readiness.promotionSourceScore * 100).toFixed(0)}%`);
    console.log(`  Quality Score: ${(review.readiness.qualityScore * 100).toFixed(0)}%`);
    console.log(`  Freshness Score: ${(review.readiness.freshnessScore * 100).toFixed(0)}%`);

    console.log('\nBLOCKERS:');
    console.log('---------');
    if (review.blockers.length === 0) {
      console.log('  No blockers');
    } else {
      for (const blocker of review.blockers) {
        console.log(`  [${blocker.severity.toUpperCase()}] ${blocker.message}`);
      }
    }

    console.log('\nWARNINGS:');
    console.log('---------');
    if (review.warnings.length === 0) {
      console.log('  No warnings');
    } else {
      for (const warning of review.warnings.slice(0, 10)) {
        console.log(`  [${warning.severity.toUpperCase()}] ${warning.message}`);
      }
      if (review.warnings.length > 10) {
        console.log(`  ... and ${review.warnings.length - 10} more`);
      }
    }

    // Get decision support
    const decision = await buildTikTokShopDataDecisionSupport();

    console.log('\nDECISION SUPPORT:');
    console.log('-----------------');
    console.log(`  Recommendation: ${decision.recommendation.toUpperCase()}`);
    console.log(`  Summary: ${decision.summary}`);

    if (decision.nextSteps.length > 0) {
      console.log('\n  Next Steps:');
      for (const step of decision.nextSteps.slice(0, 5)) {
        console.log(`    - ${step}`);
      }
    }

    console.log('\n===========================================\n');

    // Exit with appropriate code
    if (decision.recommendation === 'not_ready') {
      process.exit(1);
    } else if (decision.recommendation === 'hold') {
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Failed to run TikTok Shop Data Foundation Review', error });
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
