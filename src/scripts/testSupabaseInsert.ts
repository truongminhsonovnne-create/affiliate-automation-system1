/**
 * Test Script: Supabase Connection and Insert
 *
 * Tests:
 * 1. Environment variables are loaded correctly
 * 2. Supabase client connects successfully
 * 3. Repository can insert into affiliate_products table
 */

import dotenv from 'dotenv';
import { getSupabaseClient, getSupabaseUrl } from '../db/supabaseClient.js';
import { insertAffiliateProduct } from '../db/repositories/affiliateProductRepository.js';
import type { CreateAffiliateProductDTO } from '../types/database.js';

// Load environment
dotenv.config();

/**
 * Test result type
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Sample product data for testing
 */
const sampleProduct: CreateAffiliateProductDTO = {
  platform: 'shopee',
  external_product_id: 'test-product-001',
  title: 'Tai nghe Bluetooth test',
  price: 199000,
  image_url: 'https://example.com/image.jpg',
  original_description: 'Sản phẩm test insert từ script',
  product_url: 'https://m.shopee.vn/product/test-product-001',
  source_type: 'search',
  source_keyword: 'test',
  crawled_at: new Date().toISOString(),
  original_price: 299000,
  shop_name: 'Test Shop',
  rating: 4.5,
  review_count: 100,
  sold_count: 500,
  category: 'Tai nghe',
};

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  const results: TestResult[] = [];

  console.log('\n🧪 Starting Supabase Connection Tests\n');
  console.log('='.repeat(50));

  // Test 1: Environment Variables
  console.log('\n📋 Test 1: Environment Variables');
  try {
    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not found');
    }

    results.push({
      name: 'Environment Variables',
      passed: true,
      data: { supabaseUrl },
    });
    console.log('  ✅ PASSED - SUPABASE_URL loaded');
    console.log(`     URL: ${supabaseUrl}`);
  } catch (error) {
    results.push({
      name: 'Environment Variables',
      passed: false,
      error: (error as Error).message,
    });
    console.log(`  ❌ FAILED - ${(error as Error).message}`);
  }

  // Test 2: Supabase Client Connection
  console.log('\n📋 Test 2: Supabase Client Connection');
  try {
    const client = getSupabaseClient();

    // Try a simple query to test connection
    const { error } = await client.from('affiliate_products').select('id').limit(1);

    if (error && error.code !== '42P01') { // Ignore "table doesn't exist" error for now
      throw new Error(error.message);
    }

    results.push({
      name: 'Supabase Client',
      passed: true,
    });
    console.log('  ✅ PASSED - Supabase client connected');
  } catch (error) {
    results.push({
      name: 'Supabase Client',
      passed: false,
      error: (error as Error).message,
    });
    console.log(`  ❌ FAILED - ${(error as Error).message}`);
  }

  // Test 3: Insert Sample Record
  console.log('\n📋 Test 3: Insert Sample Record');
  try {
    const inserted = await insertAffiliateProduct(sampleProduct);

    if (!inserted) {
      throw new Error('Insert returned null');
    }

    results.push({
      name: 'Insert Record',
      passed: true,
      data: { id: inserted.id, title: inserted.title },
    });
    console.log('  ✅ PASSED - Record inserted successfully');
    console.log(`     ID: ${inserted.id}`);
    console.log(`     Title: ${inserted.title}`);
    console.log(`     Price: ${inserted.price}`);
  } catch (error) {
    results.push({
      name: 'Insert Record',
      passed: false,
      error: (error as Error).message,
    });
    console.log(`  ❌ FAILED - ${(error as Error).message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach((result) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);

  // Exit with appropriate code
  if (failed > 0) {
    console.log('\n❌ Some tests failed!\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
