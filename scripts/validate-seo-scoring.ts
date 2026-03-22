/**
 * SEO Scoring & Scaling Validation Script
 *
 * Tests:
 * 1. Scoring correctly identifies priority vs indexable vs renderable
 * 2. Wave selection respects limits
 * 3. Sitemap eligibility logic works
 * 4. Internal linking priority logic works
 */

import {
  calculateShopEntityScore,
  calculateCategoryEntityScore,
  selectPriorityWave,
  getWaveStatus,
  isSitemapEligible,
  isInternalLinkingPriority,
  SEO_SCORING_CONFIG,
} from '../src/growthPages/policy/seoScoringPolicy.js';

function testScoring() {
  console.log('=== SEO Scoring Validation ===\n');

  // Test 1: High-quality shop should be priority
  console.log('Test 1: High-quality shop should be priority tier');
  const highQualityShop = calculateShopEntityScore(
    {
      id: 'shop_1',
      slug: 'high-quality-shop',
      name: 'High Quality Shop',
      description: 'This is a real shop with many products and great voucher deals. We offer fast shipping and excellent customer service.',
      category: 'Electronics',
      productCount: 500,
    },
    [
      { code: 'SAVE10', description: 'Save 10%', discount: '10%' },
      { code: 'SAVE20', description: 'Save 20%', discount: '20%' },
    ],
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    10
  );
  console.log(`  Score: ${highQualityShop.totalScore}`);
  console.log(`  Tier: ${highQualityShop.tier}`);
  console.log(`  Expected: priority, Actual: ${highQualityShop.tier}`);
  console.log(`  ✓ PASS: ${highQualityShop.tier === 'priority'}\n`);

  // Test 2: Low-quality shop should be renderable only
  console.log('Test 2: Low-quality shop should be renderable tier');
  const lowQualityShop = calculateShopEntityScore(
    {
      id: 'shop_2',
      slug: 'low-quality-shop',
      name: 'Low Quality',
      description: 'dán link để tìm mã giảm giá', // Generic/AI content
      category: undefined,
      productCount: 0,
    },
    [],
    null,
    0
  );
  console.log(`  Score: ${lowQualityShop.totalScore}`);
  console.log(`  Tier: ${lowQualityShop.tier}`);
  console.log(`  Expected: renderable, Actual: ${lowQualityShop.tier}`);
  console.log(`  ✓ PASS: ${lowQualityShop.tier === 'renderable'}\n`);

  // Test 3: Medium-quality shop should be indexable
  console.log('Test 3: Medium-quality shop should be indexable tier');
  const mediumQualityShop = calculateShopEntityScore(
    {
      id: 'shop_3',
      slug: 'medium-shop',
      name: 'Medium Shop',
      description: 'A decent shop',
      category: 'Fashion',
      productCount: 50,
    },
    [],
    new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    2
  );
  console.log(`  Score: ${mediumQualityShop.totalScore}`);
  console.log(`  Tier: ${mediumQualityShop.tier}`);
  console.log(`  Expected: indexable, Actual: ${mediumQualityShop.tier}`);
  console.log(`  ✓ PASS: ${mediumQualityShop.tier === 'indexable'}\n`);

  // Test 4: Stale data should score lower
  console.log('Test 4: Stale data should have lower freshness score');
  const staleShop = calculateShopEntityScore(
    {
      id: 'shop_4',
      slug: 'stale-shop',
      name: 'Stale Shop',
      description: 'A shop with stale data',
      category: 'Books',
      productCount: 100,
    },
    [],
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    0
  );
  console.log(`  Freshness score: ${staleShop.dataFreshness}`);
  console.log(`  Total score: ${staleShop.totalScore}`);
  console.log(`  Expected: Low freshness (< 5), Actual: ${staleShop.dataFreshness}`);
  console.log(`  ✓ PASS: ${staleShop.dataFreshness < 5}\n`);

  // Test 5: Wave selection respects limits
  console.log('Test 5: Wave selection respects limits');
  const mockShopScores = Array(30).fill(null).map((_, i) => ({
    entityType: 'shop' as const,
    entitySlug: `shop_${i}`,
    entityName: `Shop ${i}`,
    dataCompleteness: 30,
    contentQuality: 20,
    dataFreshness: 10,
    relatedStrength: 10,
    totalScore: 70 + (i % 10),
    tier: 'priority' as const,
    signals: [],
  }));

  const mockCategoryScores = Array(30).fill(null).map((_, i) => ({
    entityType: 'category' as const,
    entitySlug: `cat_${i}`,
    entityName: `Category ${i}`,
    dataCompleteness: 30,
    contentQuality: 20,
    dataFreshness: 10,
    relatedStrength: 10,
    totalScore: 70 + (i % 10),
    tier: 'priority' as const,
    signals: [],
  }));

  const wave1 = selectPriorityWave(mockShopScores, mockCategoryScores, 1);
  console.log(`  Wave 1 shop limit: ${SEO_SCORING_CONFIG.WAVE_SIZE.INITIAL}`);
  console.log(`  Wave 1 selected shops: ${wave1.shops.length}`);
  console.log(`  Wave 1 selected categories: ${wave1.categories.length}`);
  console.log(`  ✓ PASS: ${wave1.shops.length <= SEO_SCORING_CONFIG.WAVE_SIZE.INITIAL}\n`);

  // Test 6: Sitemap eligibility
  console.log('Test 6: Sitemap eligibility check');
  const priorityScore = mockShopScores[0];
  const renderableScore = mockShopScores.find(s => s.totalScore < 50) || mockShopScores[mockShopScores.length - 1];

  console.log(`  Priority score tier: ${priorityScore.tier}`);
  console.log(`  Renderable score tier: ${renderableScore.tier}`);
  console.log(`  Priority eligible: ${isSitemapEligible(priorityScore, 1)}`);
  console.log(`  Renderable eligible: ${isSitemapEligible(renderableScore, 1)}`);
  console.log(`  ✓ PASS: ${isSitemapEligible(priorityScore, 1) && !isSitemapEligible(renderableScore, 1)}\n`);

  // Test 7: Internal linking priority
  console.log('Test 7: Internal linking priority check');
  console.log(`  Priority score is internal linking priority: ${isInternalLinkingPriority(priorityScore)}`);
  console.log(`  Renderable score is internal linking priority: ${isInternalLinkingPriority(renderableScore)}`);
  console.log(`  ✓ PASS: ${isInternalLinkingPriority(priorityScore) && !isInternalLinkingPriority(renderableScore)}\n`);

  // Test 8: Wave status
  console.log('Test 8: Wave status provides correct stats');
  const status = getWaveStatus(mockShopScores, mockCategoryScores, 1);
  console.log(`  Wave: ${status.wave}`);
  console.log(`  Total entities: ${status.totalEntities}`);
  console.log(`  Priority entities: ${status.priorityEntities}`);
  console.log(`  Indexable entities: ${status.indexableEntities}`);
  console.log(`  ✓ PASS: ${status.totalEntities === 60}\n`);

  console.log('=== All Tests Complete ===');
}

testScoring();
