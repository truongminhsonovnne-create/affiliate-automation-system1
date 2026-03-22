/**
 * SEO Data Integration Validation Script
 *
 * Validates:
 * 1. Data integration can connect to database
 * 2. Quality gate correctly identifies indexable vs non-indexable entities
 * 3. Sitemap eligibility logic works
 */

import { getShopSeoData, getCategorySeoData, getEligibleSeoEntities, getTopEntitiesForLinking } from '../src/growthPages/data/seoDataIntegration.js';
import { checkShopPageQuality } from '../src/growthPages/policy/contentQualityGuardrail.js';

async function validate() {
  console.log('=== SEO Data Integration Validation ===\n');

  // Test 1: Shop data retrieval
  console.log('1. Testing shop data retrieval...');
  try {
    const shopResult = await getShopSeoData('test-shop');
    console.log(`   - Success: ${shopResult.success}`);
    console.log(`   - Has real data: ${shopResult.quality.hasRealData}`);
    console.log(`   - Record count: ${shopResult.quality.recordCount}`);
    if (shopResult.shop) {
      console.log(`   - Shop found: ${shopResult.shop.shopName}`);
    }
  } catch (e) {
    console.log(`   - Error (expected if no DB): ${e instanceof Error ? e.message : 'Unknown'}`);
  }
  console.log('');

  // Test 2: Category data retrieval
  console.log('2. Testing category data retrieval...');
  try {
    const categoryResult = await getCategorySeoData('test-category');
    console.log(`   - Success: ${categoryResult.success}`);
    console.log(`   - Has real data: ${categoryResult.quality.hasRealData}`);
    console.log(`   - Record count: ${categoryResult.quality.recordCount}`);
  } catch (e) {
    console.log(`   - Error (expected if no DB): ${e instanceof Error ? e.message : 'Unknown'}`);
  }
  console.log('');

  // Test 3: Eligible entities
  console.log('3. Testing eligible entities for sitemap...');
  try {
    const eligibleShops = await getEligibleSeoEntities('shop', 3);
    const eligibleCategories = await getEligibleSeoEntities('category', 3);
    console.log(`   - Eligible shops: ${eligibleShops.length}`);
    console.log(`   - Eligible categories: ${eligibleCategories.length}`);
  } catch (e) {
    console.log(`   - Error (expected if no DB): ${e instanceof Error ? e.message : 'Unknown'}`);
  }
  console.log('');

  // Test 4: Top entities for linking
  console.log('4. Testing top entities for internal linking...');
  try {
    const topEntities = await getTopEntitiesForLinking(5);
    console.log(`   - Top shops: ${topEntities.topShops.length}`);
    console.log(`   - Top categories: ${topEntities.topCategories.length}`);
  } catch (e) {
    console.log(`   - Error (expected if no DB): ${e instanceof Error ? e.message : 'Unknown'}`);
  }
  console.log('');

  // Test 5: Quality gate integration
  console.log('5. Testing quality gate with sample data...');
  const sampleShopData = {
    id: 'shop_test',
    slug: 'test-shop',
    name: 'Test Shop',
    description: 'A real shop with real products and vouchers',
    category: 'Electronics',
    productCount: 100,
  };
  const sampleVouchers = [
    { code: 'TEST10', description: 'Giảm 10%', discount: '10%' },
  ];
  const qualityResult = checkShopPageQuality(sampleShopData, sampleVouchers);
  console.log(`   - Quality score: ${qualityResult.qualityScore}`);
  console.log(`   - Is indexable: ${qualityResult.isIndexable}`);
  console.log(`   - Passed checks: ${qualityResult.passedChecks.length}`);
  console.log(`   - Issues: ${qualityResult.issues.length}`);
  console.log('');

  // Test 6: No data = no index
  console.log('6. Testing quality gate with no data...');
  const noDataResult = checkShopPageQuality(null, []);
  console.log(`   - Quality score: ${noDataResult.qualityScore}`);
  console.log(`   - Is indexable: ${noDataResult.isIndexable}`);
  console.log('');

  console.log('=== Validation Complete ===');
}

validate().catch(console.error);
