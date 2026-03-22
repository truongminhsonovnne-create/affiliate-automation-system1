/**
 * TikTok Shop Detail Extraction Cycle CLI Script
 */

import { runTikTokShopDetailCycle } from '../platform/tiktokShop/acquisition/service/tiktokShopAcquisitionService.js';
import { logger } from '../utils/logger.js';

async function main() {
  console.log('\n===========================================');
  console.log('TIKTOK SHOP DETAIL EXTRACTION CYCLE');
  console.log('===========================================\n');

  const referenceKeys = process.argv.slice(2);

  if (referenceKeys.length === 0) {
    console.log('Usage: npm run tiktok:detail -- <referenceKey1> [referenceKey2] ...');
    console.log('Example: npm run tiktok:detail -- tiktok-product-123 tiktok-product-456');
    process.exit(1);
  }

  try {
    console.log(`Extracting details for ${referenceKeys.length} references...\n`);

    const results = await runTikTokShopDetailCycle(referenceKeys);

    console.log(`Total: ${results.length}`);
    console.log(`Extracted: ${results.filter(r => r.extractionStatus === 'extracted').length}`);
    console.log(`Partial: ${results.filter(r => r.extractionStatus === 'partial').length}`);
    console.log(`Failed: ${results.filter(r => r.extractionStatus === 'failed').length}`);

    console.log('\n===========================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
