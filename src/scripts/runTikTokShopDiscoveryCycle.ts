/**
 * TikTok Shop Discovery Cycle CLI Script
 */

import { runTikTokShopDiscoveryCycle } from '../platform/tiktokShop/acquisition/service/tiktokShopAcquisitionService.js';
import { logger } from '../utils/logger.js';

async function main() {
  console.log('\n===========================================');
  console.log('TIKTOK SHOP DISCOVERY CYCLE');
  console.log('===========================================\n');

  try {
    const result = await runTikTokShopDiscoveryCycle();

    console.log(`Job ID: ${result.jobId}`);
    console.log(`Status: ${result.jobStatus}`);
    console.log(`Items Discovered: ${result.itemsDiscovered}`);
    console.log(`Items Deduped: ${result.itemsDeduped}`);
    console.log(`Items Failed: ${result.itemsFailed}`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(e => console.log(`  - ${e.message}`));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  - ${w.message}`));
    }

    console.log('\n===========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
