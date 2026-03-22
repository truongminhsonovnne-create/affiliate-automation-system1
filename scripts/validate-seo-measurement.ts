/**
 * SEO Measurement & Analytics Validation Script
 *
 * Tests:
 * 1. Page classification correctly identifies page types
 * 2. Entity dimensions build correctly from various inputs
 * 3. SEO-to-tool funnel tracking works
 * 4. Search Console URL classification works
 * 5. Sitemap priority mapping is correct
 */

import {
  getPageClassification,
  buildSeoEntityDimensions,
  buildSeoAnalyticsContext,
  validateSeoDimensions,
  classifyUrlForSearchConsole,
  getSitemapPriorityForPageType,
  type SeoPageClassification,
  type SeoEntityDimensions,
} from '../src/growthPages/analytics/seoMeasurement.js';
import { GrowthSurfaceType } from '../src/growthPages/types/index.js';

function testPageClassification() {
  console.log('=== Page Classification Tests ===\n');

  const tests = [
    { input: 'homepage' as const, expected: 'seo_home' as SeoPageClassification },
    { input: GrowthSurfaceType.TOOL_EXPLAINER, expected: 'seo_tool_explainer' as SeoPageClassification },
    { input: GrowthSurfaceType.CATEGORY, expected: 'seo_category' as SeoPageClassification },
    { input: GrowthSurfaceType.SHOP, expected: 'seo_shop' as SeoPageClassification },
  ];

  let passed = 0;
  for (const test of tests) {
    const result = getPageClassification(test.input);
    const pass = result === test.expected;
    console.log(`  ${test.input} → ${result} (expected: ${test.expected}) ${pass ? '✓' : '✗'}`);
    if (pass) passed++;
  }

  console.log(`\n  Passed: ${passed}/${tests.length}\n`);
  return passed === tests.length;
}

function testEntityDimensions() {
  console.log('=== Entity Dimensions Tests ===\n');

  // Test 1: Priority shop
  console.log('Test 1: Priority shop (high quality, priority flag)');
  const priorityShop = buildSeoEntityDimensions({
    surfaceType: GrowthSurfaceType.SHOP,
    slug: 'priority-shop',
    name: 'Priority Shop',
    isIndexable: true,
    isPriority: true,
    wave: 1,
    qualityScore: 85,
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    hasVoucherData: true,
    productCount: 500,
  });
  console.log(`  indexabilityState: ${priorityShop.indexabilityState} (expected: priority-indexable)`);
  console.log(`  contentQualityBand: ${priorityShop.contentQualityBand} (expected: high)`);
  console.log(`  dataFreshness: ${priorityShop.dataFreshness} (expected: fresh)`);
  const test1Pass = priorityShop.indexabilityState === 'priority-indexable' &&
    priorityShop.contentQualityBand === 'high' &&
    priorityShop.dataFreshness === 'fresh';
  console.log(`  ${test1Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 2: Indexable category
  console.log('Test 2: Indexable category (medium quality)');
  const indexableCat = buildSeoEntityDimensions({
    surfaceType: GrowthSurfaceType.CATEGORY,
    slug: 'electronics',
    name: 'Electronics',
    isIndexable: true,
    isPriority: false,
    wave: 2,
    qualityScore: 60,
    lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    hasVoucherData: true,
    productCount: 100,
  });
  console.log(`  indexabilityState: ${indexableCat.indexabilityState} (expected: indexable)`);
  console.log(`  contentQualityBand: ${indexableCat.contentQualityBand} (expected: medium)`);
  const test2Pass = indexableCat.indexabilityState === 'indexable' &&
    indexableCat.contentQualityBand === 'medium';
  console.log(`  ${test2Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 3: Renderable page (low quality)
  console.log('Test 3: Renderable page (low quality)');
  const renderablePage = buildSeoEntityDimensions({
    surfaceType: GrowthSurfaceType.SHOP,
    slug: 'low-quality-shop',
    name: 'Low Quality Shop',
    isIndexable: false,
    isPriority: false,
    qualityScore: 30,
    lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    hasVoucherData: false,
    productCount: 0,
  });
  console.log(`  indexabilityState: ${renderablePage.indexabilityState} (expected: renderable)`);
  console.log(`  contentQualityBand: ${renderablePage.contentQualityBand} (expected: low)`);
  console.log(`  dataFreshness: ${renderablePage.dataFreshness} (expected: stale)`);
  const test3Pass = renderablePage.indexabilityState === 'renderable' &&
    renderablePage.contentQualityBand === 'low' &&
    renderablePage.dataFreshness === 'stale';
  console.log(`  ${test3Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 4: Tool explainer page
  console.log('Test 4: Tool explainer page');
  const toolPage = buildSeoEntityDimensions({
    surfaceType: GrowthSurfaceType.TOOL_EXPLAINER,
    slug: 'paste-link',
    name: 'Dán link tìm mã',
    isIndexable: true,
    isPriority: true,
    qualityScore: 90,
  });
  console.log(`  pageType: ${toolPage.pageType} (expected: seo_tool_explainer)`);
  console.log(`  entityType: ${toolPage.entityType} (expected: tool)`);
  const test4Pass = toolPage.pageType === 'seo_tool_explainer' && toolPage.entityType === 'tool';
  console.log(`  ${test4Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  return test1Pass && test2Pass && test3Pass && test4Pass;
}

function testUrlClassification() {
  console.log('=== URL Classification Tests ===\n');

  const tests = [
    { url: 'https://example.com/', expected: 'seo_home', isDynamic: false },
    { url: 'https://example.com/shop/shopee', expected: 'seo_shop', isDynamic: true },
    { url: 'https://example.com/category/electronics', expected: 'seo_category', isDynamic: true },
    { url: 'https://example.com/paste-link-find-voucher', expected: 'seo_tool_explainer', isDynamic: false },
    { url: 'https://example.com/how-it-works', expected: 'seo_tool_explainer', isDynamic: false },
    { url: 'https://example.com/about', expected: 'seo_static_support', isDynamic: false },
  ];

  let passed = 0;
  for (const test of tests) {
    const result = classifyUrlForSearchConsole(test.url);
    const pass = result.pageType === test.expected && result.isDynamic === test.isDynamic;
    console.log(`  ${test.url} → ${result.pageType} (dynamic: ${result.isDynamic}) ${pass ? '✓' : '✗'}`);
    if (pass) passed++;
  }

  console.log(`\n  Passed: ${passed}/${tests.length}\n`);
  return passed === tests.length;
}

function testSitemapPriority() {
  console.log('=== Sitemap Priority Tests ===\n');

  const tests = [
    { classification: 'seo_home' as SeoPageClassification, expected: 1.0 },
    { classification: 'seo_tool_explainer' as SeoPageClassification, expected: 0.9 },
    { classification: 'seo_category' as SeoPageClassification, expected: 0.6 },
    { classification: 'seo_shop' as SeoPageClassification, expected: 0.6 },
    { classification: 'seo_static_support' as SeoPageClassification, expected: 0.5 },
  ];

  let passed = 0;
  for (const test of tests) {
    const result = getSitemapPriorityForPageType(test.classification);
    const pass = result === test.expected;
    console.log(`  ${test.classification} → ${result} (expected: ${test.expected}) ${pass ? '✓' : '✗'}`);
    if (pass) passed++;
  }

  console.log(`\n  Passed: ${passed}/${tests.length}\n`);
  return passed === tests.length;
}

function testDimensionValidation() {
  console.log('=== Dimension Validation Tests ===\n');

  // Test 1: Valid priority page
  console.log('Test 1: Valid priority page');
  const validPriority: SeoEntityDimensions = {
    pageType: 'seo_shop',
    entityType: 'shop',
    entitySlug: 'test-shop',
    entityName: 'Test Shop',
    indexabilityState: 'priority-indexable',
    priorityWave: 1,
    contentQualityBand: 'high',
    dataFreshness: 'fresh',
    hasVoucherData: true,
    productCount: 100,
  };
  const validResult = validateSeoDimensions(validPriority);
  console.log(`  Valid: ${validResult.valid}, Warnings: ${validResult.warnings.length}`);
  console.log(`  ${validResult.valid ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 2: Priority without wave warning
  console.log('Test 2: Priority without wave warning');
  const noWave: SeoEntityDimensions = {
    ...validPriority,
    priorityWave: undefined,
  };
  const noWaveResult = validateSeoDimensions(noWave);
  console.log(`  Valid: ${noWaveResult.valid}, Warnings: ${noWaveResult.warnings.join(', ')}`);
  const test2Pass = !noWaveResult.valid || noWaveResult.warnings.some(w => w.includes('wave'));
  console.log(`  ${test2Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 3: Stale priority warning
  console.log('Test 3: Stale priority warning');
  const stalePriority: SeoEntityDimensions = {
    ...validPriority,
    dataFreshness: 'stale',
  };
  const staleResult = validateSeoDimensions(stalePriority);
  console.log(`  Valid: ${staleResult.valid}, Warnings: ${staleResult.warnings.join(', ')}`);
  const test3Pass = staleResult.warnings.some(w => w.includes('stale'));
  console.log(`  ${test3Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  // Test 4: Missing entity slug warning for shop
  console.log('Test 4: Missing entity slug for shop');
  const noSlug: SeoEntityDimensions = {
    ...validPriority,
    entitySlug: undefined,
  };
  const noSlugResult = validateSeoDimensions(noSlug);
  console.log(`  Warnings: ${noSlugResult.warnings.join(', ')}`);
  const test4Pass = noSlugResult.warnings.some(w => w.includes('entitySlug'));
  console.log(`  ${test4Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  return validResult.valid && test2Pass && test3Pass && test4Pass;
}

function testAnalyticsContext() {
  console.log('=== Analytics Context Tests ===\n');

  console.log('Test 1: Build full analytics context');
  const context = buildSeoAnalyticsContext({
    surfaceType: GrowthSurfaceType.SHOP,
    slug: 'test-shop',
    name: 'Test Shop',
    isIndexable: true,
    isPriority: true,
    wave: 1,
    qualityScore: 80,
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    hasVoucherData: true,
    productCount: 250,
  });

  console.log(`  classification: ${context.classification}`);
  console.log(`  dimensions.indexabilityState: ${context.dimensions.indexabilityState}`);
  console.log(`  dimensions.contentQualityBand: ${context.dimensions.contentQualityBand}`);
  console.log(`  dimensions.dataFreshness: ${context.dimensions.dataFreshness}`);

  const test1Pass = context.classification === 'seo_shop' &&
    context.dimensions.indexabilityState === 'priority-indexable' &&
    context.dimensions.contentQualityBand === 'high' &&
    context.dimensions.dataFreshness === 'fresh';
  console.log(`  ${test1Pass ? '✓ PASS' : '✗ FAIL'}\n`);

  return test1Pass;
}

// Run all tests
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        SEO MEASUREMENT VALIDATION SUITE                   ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

const results = [
  { name: 'Page Classification', pass: testPageClassification() },
  { name: 'Entity Dimensions', pass: testEntityDimensions() },
  { name: 'URL Classification', pass: testUrlClassification() },
  { name: 'Sitemap Priority', pass: testSitemapPriority() },
  { name: 'Dimension Validation', pass: testDimensionValidation() },
  { name: 'Analytics Context', pass: testAnalyticsContext() },
];

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                     SUMMARY                                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let totalPass = 0;
for (const result of results) {
  console.log(`  ${result.name}: ${result.pass ? '✓ PASS' : '✗ FAIL'}`);
  if (result.pass) totalPass++;
}

console.log(`\n  Total: ${totalPass}/${results.length} test suites passed\n`);

if (totalPass === results.length) {
  console.log('  🎉 All SEO measurement tests passed!\n');
  process.exit(0);
} else {
  console.log('  ⚠️  Some tests failed. Please review.\n');
  process.exit(1);
}
