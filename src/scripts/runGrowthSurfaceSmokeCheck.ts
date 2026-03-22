/**
 * Growth Surface Smoke Check
 *
 * CLI script to verify growth surfaces are working correctly
 * - Route availability
 * - SEO model generation
 * - CTA presence
 * - Link discipline checks
 */

import {
  GrowthSurfaceType,
  ToolPageType,
  SurfaceCtaType,
} from '../growthPages/types/index.js';
import {
  getGrowthSurfaceRouteDefinitions,
  resolveGrowthSurfaceRoute,
  buildShopPath,
  buildCategoryPath,
  buildToolPagePath,
  validateGrowthSurfaceRoute,
} from '../growthPages/routing/growthSurfaceRoutes.js';
import {
  buildShopSeoModel,
  buildCategorySeoModel,
  buildToolExplainerSeoModel,
  validateSeoModel,
} from '../growthPages/seo/seoModelBuilder.js';
import {
  getGrowthSurfaceContentPolicy,
  validateGrowthSurfaceContentDensity,
  validateGrowthSurfaceCtaDiscipline,
} from '../growthPages/content/growthSurfaceContentPolicy.js';
import {
  shouldIndexGrowthSurface,
  evaluateThinContentRisk,
} from '../growthPages/policy/indexabilityPolicy.js';
import {
  buildGrowthSurfaceCacheKey,
  getGrowthSurfaceCacheStats,
} from '../growthPages/cache/growthSurfaceCache.js';
import {
  getRouteStatistics,
} from '../growthPages/routing/growthSurfaceRoutes.js';

// ============================================================================
// Types
// ============================================================================

interface SmokeCheckResult {
  category: string;
  passed: boolean;
  message: string;
  details?: string[];
}

// ============================================================================
// Main Check
// ============================================================================

async function runSmokeCheck(): Promise<void> {
  console.log('========================================');
  console.log('Growth Surface Smoke Check');
  console.log('========================================\n');

  const results: SmokeCheckResult[] = [];

  // Run all checks
  results.push(...checkRouteDefinitions());
  results.push(...checkRouteResolutions());
  results.push(...checkSeoModels());
  results.push(...checkContentPolicy());
  results.push(...checkIndexabilityPolicy());
  results.push(...checkCacheConfiguration());
  results.push(...checkRouteStatistics());

  // Print results
  printResults(results);

  // Exit with appropriate code
  const failedCount = results.filter((r) => !r.passed).length;
  if (failedCount > 0) {
    console.log(`\n❌ Smoke check FAILED: ${failedCount} issue(s) found`);
    process.exit(1);
  } else {
    console.log('\n✅ All smoke checks PASSED');
    process.exit(0);
  }
}

// ============================================================================
// Route Checks
// ============================================================================

function checkRouteDefinitions(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('📋 Checking route definitions...');

  const routes = getGrowthSurfaceRouteDefinitions();

  if (routes.length === 0) {
    results.push({
      category: 'Routes',
      passed: false,
      message: 'No route definitions found',
    });
    return results;
  }

  results.push({
    category: 'Routes',
    passed: true,
    message: `Found ${routes.length} route definitions`,
  });

  // Check each route type
  const shopRoutes = routes.filter((r) => r.type === GrowthSurfaceType.SHOP);
  const categoryRoutes = routes.filter((r) => r.type === GrowthSurfaceType.CATEGORY);
  const toolRoutes = routes.filter((r) => r.type === GrowthSurfaceType.TOOL_EXPLAINER);

  if (shopRoutes.length > 0) {
    results.push({
      category: 'Routes',
      passed: true,
      message: `Shop routes: ${shopRoutes.length}`,
    });
  }

  if (categoryRoutes.length > 0) {
    results.push({
      category: 'Routes',
      passed: true,
      message: `Category routes: ${categoryRoutes.length}`,
    });
  }

  if (toolRoutes.length > 0) {
    results.push({
      category: 'Routes',
      passed: true,
      message: `Tool explainer routes: ${toolRoutes.length}`,
    });
  }

  return results;
}

function checkRouteResolutions(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('🔍 Checking route resolutions...');

  // Test shop path resolution
  const shopPath = '/shop/test-shop';
  const shopResolution = resolveGrowthSurfaceRoute(shopPath);
  if (shopResolution.success && shopResolution.surfaceType === GrowthSurfaceType.SHOP) {
    results.push({
      category: 'Route Resolution',
      passed: true,
      message: `Shop path resolves correctly: ${shopPath}`,
    });
  } else {
    results.push({
      category: 'Route Resolution',
      passed: false,
      message: `Shop path resolution failed: ${shopPath}`,
    });
  }

  // Test category path resolution
  const categoryPath = '/category/electronics';
  const categoryResolution = resolveGrowthSurfaceRoute(categoryPath);
  if (categoryResolution.success && categoryResolution.surfaceType === GrowthSurfaceType.CATEGORY) {
    results.push({
      category: 'Route Resolution',
      passed: true,
      message: `Category path resolves correctly: ${categoryPath}`,
    });
  } else {
    results.push({
      category: 'Route Resolution',
      passed: false,
      message: `Category path resolution failed: ${categoryPath}`,
    });
  }

  // Test tool path resolution
  const toolPath = '/how-it-works';
  const toolResolution = resolveGrowthSurfaceRoute(toolPath);
  if (toolResolution.success && toolResolution.surfaceType === GrowthSurfaceType.TOOL_EXPLAINER) {
    results.push({
      category: 'Route Resolution',
      passed: true,
      message: `Tool path resolves correctly: ${toolPath}`,
    });
  } else {
    results.push({
      category: 'Route Resolution',
      passed: false,
      message: `Tool path resolution failed: ${toolPath}`,
    });
  }

  // Test path building
  const builtShopPath = buildShopPath('my-shop');
  if (builtShopPath === '/shop/my-shop') {
    results.push({
      category: 'Route Resolution',
      passed: true,
      message: `Path building works correctly: ${builtShopPath}`,
    });
  } else {
    results.push({
      category: 'Route Resolution',
      passed: false,
      message: `Path building failed: expected /shop/my-shop, got ${builtShopPath}`,
    });
  }

  // Test slug validation
  const validSlug = validateGrowthSurfaceRoute('/shop/valid-slug');
  const invalidSlug = validateGrowthSurfaceRoute('/shop/Invalid Slug');

  if (validSlug.valid) {
    results.push({
      category: 'Route Resolution',
      passed: true,
      message: 'Valid slug passes validation',
    });
  }

  if (!invalidSlug.valid) {
    results.push({
      category: 'Route Resolution',
      passed: true,
      message: 'Invalid slug correctly rejected',
    });
  }

  return results;
}

// ============================================================================
// SEO Checks
// ============================================================================

function checkSeoModels(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('🔎 Checking SEO models...');

  // Test shop SEO model
  const shopSeo = buildShopSeoModel({
    shopName: 'Test Shop',
    shopSlug: 'test-shop',
    description: 'This is a test shop with great products and voucher codes.',
    category: 'Electronics',
    voucherHint: 'Giảm 15%',
  });

  const shopSeoValidation = validateSeoModel(shopSeo);
  if (shopSeoValidation.valid) {
    results.push({
      category: 'SEO',
      passed: true,
      message: 'Shop SEO model is valid',
    });
  } else {
    results.push({
      category: 'SEO',
      passed: false,
      message: 'Shop SEO model validation failed',
      details: shopSeoValidation.errors,
    });
  }

  // Test category SEO model
  const categorySeo = buildCategorySeoModel({
    categoryName: 'Electronics',
    categorySlug: 'electronics',
    description: 'Find the best voucher codes for electronics on Shopee.',
    typicalSavings: '50%',
    voucherPatterns: ['Giảm 10%', 'Giảm 15%', 'Freeship'],
  });

  const categorySeoValidation = validateSeoModel(categorySeo);
  if (categorySeoValidation.valid) {
    results.push({
      category: 'SEO',
      passed: true,
      message: 'Category SEO model is valid',
    });
  }

  // Test tool explainer SEO model
  const toolSeo = buildToolExplainerSeoModel({
    toolName: 'Dán link tìm mã',
    toolDescription: 'Tìm mã giảm giá tự động bằng cách dán link sản phẩm',
    toolBenefits: ['Nhanh chóng', 'Miễn phí', 'Chính xác'],
    toolPageType: ToolPageType.PASTE_LINK,
  });

  const toolSeoValidation = validateSeoModel(toolSeo);
  if (toolSeoValidation.valid) {
    results.push({
      category: 'SEO',
      passed: true,
      message: 'Tool explainer SEO model is valid',
    });
  }

  // Test thin content detection
  const thinRisk = evaluateThinContentRisk({
    titleLength: 10,
    descriptionLength: 30,
    highlightCount: 0,
    sectionCount: 0,
  });

  if (thinRisk.isThin) {
    results.push({
      category: 'SEO',
      passed: true,
      message: 'Thin content detection works correctly',
    });
  }

  return results;
}

// ============================================================================
// Content Policy Checks
// ============================================================================

function checkContentPolicy(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('📜 Checking content policy...');

  const policy = getGrowthSurfaceContentPolicy();
  results.push({
    category: 'Content Policy',
    passed: true,
    message: `Content policy loaded: max ${policy.maxSections} sections, max ${policy.maxCtas} CTAs`,
  });

  // Test CTA discipline validation
  const validCta = {
    primary: {
      type: SurfaceCtaType.PASTE_LINK,
      label: 'Dán link tìm mã',
      href: '/paste-link-find-voucher',
      trackingId: 'test',
    },
    secondary: [
      {
        type: SurfaceCtaType.VIEW_SHOP,
        label: 'Xem shop',
        href: '/shop/test',
        trackingId: 'test2',
      },
    ],
  };

  const ctaValidation = validateGrowthSurfaceCtaDiscipline(validCta, GrowthSurfaceType.SHOP);
  if (ctaValidation.isValid) {
    results.push({
      category: 'Content Policy',
      passed: true,
      message: 'CTA discipline validation works correctly',
    });
  }

  // Test content density validation
  const validContent = {
    title: 'Test Shop',
    subtitle: 'Test Category',
    description: 'This is a test shop with great products and voucher codes. We offer the best deals and discounts for our customers.',
    highlights: ['Free shipping', 'Best prices', 'Quality products'],
  };

  const densityValidation = validateGrowthSurfaceContentDensity(
    GrowthSurfaceType.SHOP,
    validContent,
    [{ title: 'Section 1', content: 'Content here' }]
  );

  if (densityValidation.isValid) {
    results.push({
      category: 'Content Policy',
      passed: true,
      message: 'Content density validation works correctly',
    });
  }

  return results;
}

// ============================================================================
// Indexability Checks
// ============================================================================

function checkIndexabilityPolicy(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('🔒 Checking indexability policy...');

  // Test shouldIndex for tool pages (should always index)
  const toolSeo = buildToolExplainerSeoModel({
    toolName: 'Test Tool',
    toolDescription: 'Test tool description',
    toolBenefits: ['Benefit 1'],
    toolPageType: ToolPageType.HOW_IT_WORKS,
  });

  const toolIndexDecision = shouldIndexGrowthSurface(GrowthSurfaceType.TOOL_EXPLAINER, toolSeo);
  if (toolIndexDecision.shouldIndex) {
    results.push({
      category: 'Indexability',
      passed: true,
      message: 'Tool pages correctly marked for indexing',
    });
  }

  // Test shouldIndex for shop pages with thin content (should not index)
  const thinShopSeo = {
    title: 'AB',
    description: 'Short',
    canonicalUrl: 'https://example.com/shop/test',
    ogTitle: 'AB',
    ogDescription: 'Short',
    noIndex: false,
    noFollow: false,
  };

  const thinShopIndexDecision = shouldIndexGrowthSurface(GrowthSurfaceType.SHOP, thinShopSeo as any);
  if (!thinShopIndexDecision.shouldIndex) {
    results.push({
      category: 'Indexability',
      passed: true,
      message: 'Thin content correctly marked for noindex',
    });
  }

  return results;
}

// ============================================================================
// Cache Checks
// ============================================================================

function checkCacheConfiguration(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('💾 Checking cache configuration...');

  // Test cache key building
  const shopCacheKey = buildGrowthSurfaceCacheKey(GrowthSurfaceType.SHOP, 'test-shop');
  if (shopCacheKey.includes('growth:shop:')) {
    results.push({
      category: 'Cache',
      passed: true,
      message: 'Cache key building works correctly',
    });
  }

  // Get cache stats
  const cacheStats = getGrowthSurfaceCacheStats();
  results.push({
    category: 'Cache',
    passed: true,
    message: `Cache initialized: ${cacheStats.totalEntries} entries`,
  });

  return results;
}

// ============================================================================
// Route Statistics
// ============================================================================

function checkRouteStatistics(): SmokeCheckResult[] {
  const results: SmokeCheckResult[] = [];

  console.log('📊 Checking route statistics...');

  const stats = getRouteStatistics();

  results.push({
    category: 'Statistics',
    passed: true,
    message: `Total routes: ${stats.totalRoutes}, Indexable: ${stats.indexableRoutes}`,
  });

  return results;
}

// ============================================================================
// Print Results
// ============================================================================

function printResults(results: SmokeCheckResult[]): void {
  console.log('\n========================================');
  console.log('Results');
  console.log('========================================\n');

  // Group by category
  const grouped = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, SmokeCheckResult[]>);

  // Print each category
  for (const [category, items] of Object.entries(grouped)) {
    console.log(`\n📁 ${category}`);
    console.log('─'.repeat(40));

    for (const item of items) {
      const icon = item.passed ? '✅' : '❌';
      console.log(`${icon} ${item.message}`);

      if (item.details && item.details.length > 0) {
        for (const detail of item.details) {
          console.log(`   - ${detail}`);
        }
      }
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================');
}

// ============================================================================
// Run
// ============================================================================

runSmokeCheck().catch((error) => {
  console.error('Smoke check failed with error:', error);
  process.exit(1);
});
