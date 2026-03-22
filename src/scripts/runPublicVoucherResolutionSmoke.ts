// =============================================================================
// Public Voucher Resolution Smoke Test
// CLI script to smoke test the public resolution API
// =============================================================================

import { resolveVoucherForPublicInput } from '../publicApi/service/publicVoucherResolutionService.js';
import { logger } from '../utils/logger.js';

interface SmokeTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

/**
 * Run smoke tests for public voucher resolution
 */
async function main() {
  console.log('=== Public Voucher Resolution Smoke Test ===\n');

  const results: SmokeTestResult[] = [];

  // Test 1: Valid Shopee URL
  const test1 = await runTest('Valid Shopee URL', async () => {
    const result = await resolveVoucherForPublicInput({
      input: 'https://shopee.vn/product/123456789/1234567890',
      requestId: 'smoke-test-1',
    });

    if (!result.requestId) {
      throw new Error('Missing requestId in response');
    }

    console.log('  Response status:', result.status);
    console.log('  Performance:', result.performance);
  });
  results.push(test1);

  // Test 2: Invalid input
  const test2 = await runTest('Invalid input (short)', async () => {
    const result = await resolveVoucherForPublicInput({
      input: 'ab',
      requestId: 'smoke-test-2',
    });

    if (result.status !== 'invalid_input') {
      throw new Error(`Expected invalid_input, got ${result.status}`);
    }

    console.log('  Response status:', result.status);
  });
  results.push(test2);

  // Test 3: Empty input
  const test3 = await runTest('Empty input', async () => {
    const result = await resolveVoucherForPublicInput({
      input: '',
      requestId: 'smoke-test-3',
    });

    if (result.status !== 'invalid_input') {
      throw new Error(`Expected invalid_input, got ${result.status}`);
    }

    console.log('  Response status:', result.status);
  });
  results.push(test3);

  // Test 4: Rate limiting
  const test4 = await runTest('Rate limiting', async () => {
    // Make multiple requests to trigger rate limit
    for (let i = 0; i < 5; i++) {
      await resolveVoucherForPublicInput({
        input: `https://shopee.vn/product/test/${i}`,
        requestId: `smoke-test-4-${i}`,
      }, { skipCache: true });
    }

    // The 6th request might be rate limited
    const result = await resolveVoucherForPublicInput({
      input: 'https://shopee.vn/product/test/6',
      requestId: 'smoke-test-4-6',
    }, { skipCache: true });

    console.log('  Rate limited status:', result.status);
  });
  results.push(test4);

  // Print summary
  console.log('\n=== Summary ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.testName}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n✓ All smoke tests passed!');
}

async function runTest(name: string, fn: () => Promise<void>): Promise<SmokeTestResult> {
  const start = Date.now();

  try {
    console.log(`\nTest: ${name}`);
    await fn();
    const duration = Date.now() - start;
    console.log(`  ✓ Passed (${duration}ms)`);
    return { testName: name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(`  ✗ Failed: ${message}`);
    return { testName: name, passed: false, duration, error: message };
  }
}

main().catch((error) => {
  logger.error({ error }, 'Smoke test failed');
  console.error('\nSmoke test failed:', error);
  process.exit(1);
});
