#!/usr/bin/env node
/**
 * Voucher Resolution Smoke Test
 *
 * CLI script to test voucher resolution end-to-end.
 */

import { resolveBestVoucherForShopeeUrl } from '../voucherEngine/service/voucherResolutionService';
import { serializeVoucherResolutionResult } from '../voucherEngine/api/serializers';

/**
 * Test URLs
 */
const testUrls = [
  'https://shopee.vn/product/12345678/987654321',
  'https://shopee.vn/fashion-store/i.12345678.987654321',
  'https://shopee.vn/Ao-Thun-Nam-Cotton-Basic-i.12345678.987654321',
];

/**
 * Run smoke test
 */
async function runSmokeTest() {
  console.log('='.repeat(60));
  console.log('Voucher Resolution Engine - Smoke Test');
  console.log('='.repeat(60));
  console.log();

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`Test ${i + 1}: ${url}`);
    console.log('-'.repeat(60));

    try {
      const result = await resolveBestVoucherForShopeeUrl({ url });

      if (result.hasMatch && result.bestVoucher) {
        console.log('✓ PASSED');
        console.log(`  Best voucher: ${result.bestVoucher.title}`);
        console.log(`  Code: ${result.bestVoucher.code || 'N/A'}`);
        console.log(`  Discount: ${result.bestVoucher.discountValue}${result.bestVoucher.discountType === 'percentage' ? '%' : 'đ'}`);
        console.log(`  Match type: ${result.matchType}`);
        console.log(`  Duration: ${result.resolutionDurationMs}ms`);
        console.log(`  Cached: ${result.cached}`);

        if (result.explanation.bestMatchReason) {
          console.log(`  Reason: ${result.explanation.bestMatchReason}`);
        }

        passed++;
      } else {
        console.log('⚠ NO MATCH');
        console.log(`  ${result.explanation.noMatchReason || 'No matching voucher found'}`);
        console.log(`  Duration: ${result.resolutionDurationMs}ms`);

        if (result.explanation.fallbackRecommendation) {
          console.log(`  Fallback: ${result.explanation.fallbackRecommendation.recommendation}`);
        }

        passed++; // Still passed - no crash
      }
    } catch (error) {
      console.log('✗ FAILED');
      console.log(`  Error: ${(error as Error).message}`);
      failed++;
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total tests: ${testUrls.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();

  // Test edge cases
  console.log('Edge Cases:');
  console.log('-'.repeat(60));

  // Test invalid URL
  try {
    await resolveBestVoucherForShopeeUrl({ url: 'not-a-url' });
    console.log('✗ Invalid URL should have thrown');
    failed++;
  } catch (error) {
    console.log('✓ Invalid URL correctly rejected');
    passed++;
  }

  // Test empty URL
  try {
    await resolveBestVoucherForShopeeUrl({ url: '' });
    console.log('✗ Empty URL should have thrown');
    failed++;
  } catch (error) {
    console.log('✓ Empty URL correctly rejected');
    passed++;
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Final Results');
  console.log('='.repeat(60));
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
runSmokeTest().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
