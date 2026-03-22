/**
 * TikTok Shop Acquisition Health Check CLI Script
 */

import { evaluateTikTokShopAcquisitionHealth } from '../platform/tiktokShop/acquisition/health/tiktokShopAcquisitionHealthService.js';
import { buildTikTokShopAcquisitionDecisionSupport } from '../platform/tiktokShop/acquisition/service/tiktokShopAcquisitionService.js';

async function main() {
  console.log('\n===========================================');
  console.log('TIKTOK SHOP ACQUISITION HEALTH CHECK');
  console.log('===========================================\n');

  try {
    const health = await evaluateTikTokShopAcquisitionHealth();
    const decision = await buildTikTokShopAcquisitionDecisionSupport();

    console.log('HEALTH STATUS:');
    console.log(`  Runtime Health: ${health.runtimeHealth}`);
    console.log(`  Health Score: ${(health.healthScore * 100).toFixed(0)}%`);
    console.log(`  Success Rate: ${(health.successRate * 100).toFixed(0)}%`);
    console.log(`  Should Throttle: ${health.shouldThrottle}`);
    console.log(`  Should Pause: ${health.shouldPause}`);

    if (health.pauseReasons.length > 0) {
      console.log('\n  Pause Reasons:');
      health.pauseReasons.forEach(r => console.log(`    - ${r}`));
    }

    console.log('\nDECISION:');
    console.log(`  Recommendation: ${decision.recommendation.toUpperCase()}`);
    console.log(`  Summary: ${decision.summary}`);

    if (decision.nextSteps.length > 0) {
      console.log('\n  Next Steps:');
      decision.nextSteps.forEach(s => console.log(`    - ${s}`));
    }

    console.log('\n===========================================\n');

    if (health.shouldPause) {
      process.exit(1);
    } else if (health.shouldThrottle) {
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
