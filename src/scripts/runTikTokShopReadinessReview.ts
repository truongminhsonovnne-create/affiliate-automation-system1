/**
 * Run TikTok Shop Readiness Review
 *
 * CLI script specifically for TikTok Shop readiness review.
 * Usage: npx tsx src/scripts/runTikTokShopReadinessReview.ts
 */

import { runTikTokShopReadinessReview } from '../platform/service/multiPlatformFoundationService.js';
import { buildTikTokShopReadinessFramework } from '../platform/readiness/tiktokShopReadinessFramework.js';
import { logger } from '../utils/logger.js';

async function main(): Promise<void> {
  logger.info({ msg: 'Starting TikTok Shop Readiness Review' });

  try {
    const startTime = Date.now();
    const result = await runTikTokShopReadinessReview();
    const duration = Date.now() - startTime;

    logger.info({
      msg: 'TikTok Shop Readiness Review Completed',
      duration,
      status: result.status,
      score: result.score.overall,
      blockers: result.blockers,
      warnings: result.warnings,
    });

    console.log('\n=== TikTok Shop Readiness Review Results ===');
    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Overall Score: ${(result.score.overall * 100).toFixed(0)}%`);
    console.log(`\nScore Breakdown:`);
    console.log(`  - Domain Model: ${(result.score.domainModel * 100).toFixed(0)}%`);
    console.log(`  - Parser/Reference: ${(result.score.parserReference * 100).toFixed(0)}%`);
    console.log(`  - Product Context: ${(result.score.productContext * 100).toFixed(0)}%`);
    console.log(`  - Promotion Rules: ${(result.score.promotionRules * 100).toFixed(0)}%`);
    console.log(`  - Public Flow: ${(result.score.publicFlow * 100).toFixed(0)}%`);
    console.log(`  - Commercial Attribution: ${(result.score.commercialAttribution * 100).toFixed(0)}%`);
    console.log(`  - Governance: ${(result.score.governance * 100).toFixed(0)}%`);

    console.log(`\nBlockers: ${result.blockers.length}`);
    result.blockers.slice(0, 5).forEach(b => {
      console.log(`  - [${b.severity}] ${b.title}`);
    });

    console.log(`\nWarnings: ${result.warnings.length}`);
    result.warnings.slice(0, 5).forEach(w => {
      console.log(`  - [${w.severity}] ${w.title}`);
    });

    console.log(`\nSummary: ${result.summary}`);
    console.log(`\nDuration: ${duration}ms`);

    // Determine if ready to proceed
    console.log('\n=== Decision ===');
    if (result.status === 'ready') {
      console.log('✅ TikTok Shop is READY for expansion');
    } else if (result.status === 'proceed_cautiously') {
      console.log('⚠️  TikTok Shop can PROCEED WITH CAUTION');
    } else if (result.status === 'hold') {
      console.log('⏸️  TikTok Shop should HOLD - more preparation needed');
    } else {
      console.log('❌ TikTok Shop is NOT READY - critical blockers exist');
    }

    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'TikTok Shop Readiness Review Failed', error });
    console.error('\n!!! TikTok Shop Readiness Review Failed !!!');
    console.error(error);
    process.exit(1);
  }
}

main();
