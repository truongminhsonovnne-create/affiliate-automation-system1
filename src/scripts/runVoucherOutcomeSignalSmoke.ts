/**
 * Voucher Outcome Signal Smoke Test
 *
 * Tests the outcome signal recording flow
 */

import {
  Platform,
  VoucherOutcomeEventType,
} from '../voucherIntelligence/types/index.js';
import {
  recordVoucherResolutionOutcome,
  recordVoucherCopied,
  recordOpenShopeeClicked,
  recordBestVoucherViewed,
  recordNoMatchOutcome,
  recordFallbackClicked,
} from '../voucherIntelligence/events/publicOutcomeRecorder.js';

// ============================================================================
// Test Types
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// ============================================================================
// Tests
// ============================================================================

async function testRecordResolutionOutcome(): Promise<void> {
  const testName = 'recordVoucherResolutionOutcome';

  try {
    const outcomeId = await recordVoucherResolutionOutcome({
      platform: Platform.SHOPEE,
      normalizedUrl: 'https://shopee.vn/product/123/456',
      bestVoucherId: 'voucher-1',
      shownVoucherIds: ['voucher-1', 'voucher-2'],
      growthSurfaceType: 'shop',
    });

    if (!outcomeId) {
      throw new Error('No outcome ID returned');
    }

    results.push({ name: testName, passed: true });
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testRecordVoucherCopied(): Promise<void> {
  const testName = 'recordVoucherCopied';

  try {
    // First create an outcome
    const outcomeId = await recordVoucherResolutionOutcome({
      platform: Platform.SHOPEE,
      normalizedUrl: 'https://shopee.vn/product/123/456',
      bestVoucherId: 'voucher-1',
      shownVoucherIds: ['voucher-1'],
    });

    await recordVoucherCopied(outcomeId, 'voucher-1', 'session-123', true);

    results.push({ name: testName, passed: true });
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testRecordOpenShopee(): Promise<void> {
  const testName = 'recordOpenShopeeClicked';

  try {
    const outcomeId = await recordVoucherResolutionOutcome({
      platform: Platform.SHOPEE,
      normalizedUrl: 'https://shopee.vn/product/123/456',
      bestVoucherId: 'voucher-1',
      shownVoucherIds: ['voucher-1'],
    });

    await recordOpenShopeeClicked(outcomeId, 'voucher-1', 'session-123');

    results.push({ name: testName, passed: true });
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testRecordBestVoucherViewed(): Promise<void> {
  const testName = 'recordBestVoucherViewed';

  try {
    const outcomeId = await recordVoucherResolutionOutcome({
      platform: Platform.SHOPEE,
      normalizedUrl: 'https://shopee.vn/product/123/456',
      bestVoucherId: 'voucher-1',
      shownVoucherIds: ['voucher-1'],
    });

    await recordBestVoucherViewed(outcomeId, 'voucher-1', 'session-123');

    results.push({ name: testName, passed: true });
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testRecordNoMatch(): Promise<void> {
  const testName = 'recordNoMatchOutcome';

  try {
    const outcomeId = await recordNoMatchOutcome({
      platform: Platform.SHOPEE,
      normalizedUrl: 'https://shopee.vn/product/999/999',
      attributionContext: {
        growthSurfaceType: 'category',
      },
    });

    if (!outcomeId) {
      throw new Error('No outcome ID returned');
    }

    results.push({ name: testName, passed: true });
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function testRecordFallback(): Promise<void> {
  const testName = 'recordFallbackClicked';

  try {
    const outcomeId = await recordNoMatchOutcome({
      platform: Platform.SHOPEE,
      normalizedUrl: 'https://shopee.vn/product/999/999',
    });

    await recordFallbackClicked(outcomeId, 'browse_popular', 'session-123');

    results.push({ name: testName, passed: true });
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// Main
// ============================================================================

async function runSmokeTests() {
  console.log('========================================');
  console.log('Voucher Outcome Signal Smoke Tests');
  console.log('========================================\n');

  // Run all tests
  await testRecordResolutionOutcome();
  await testRecordVoucherCopied();
  await testRecordOpenShopee();
  await testRecordBestVoucherViewed();
  await testRecordNoMatch();
  await testRecordFallback();

  // Print results
  console.log('Results');
  console.log('─'.repeat(40));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);

    if (result.passed) {
      passed++;
    } else {
      failed++;
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log('');
  console.log('========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runSmokeTests().catch(console.error);
