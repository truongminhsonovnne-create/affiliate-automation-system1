/**
 * Regression Pack
 *
 * Provides regression testing pack functionality.
 */

import type { RegressionPack, TestScenario, TestEnvironment, RegressionBaseline } from '../types';
import { REGRESSION_PACK_TIME_BUDGET_MS, MAX_REGRESSION_SCENARIOS } from '../constants';

/**
 * Regression test category
 */
export type RegressionCategory = 'core' | 'crawler' | 'ai' | 'publishing' | 'integration';

/**
 * Create regression pack
 */
export function createRegressionPack(
  name: string,
  description: string,
  scenarios: TestScenario[]
): RegressionPack {
  return {
    name,
    description,
    scenarios: scenarios.slice(0, MAX_REGRESSION_SCENARIOS),
    baseline: undefined,
  };
}

/**
 * Get core regression scenarios
 */
export function getCoreRegressionScenarios(): TestScenario[] {
  return [
    {
      id: 'core-product-extraction',
      name: 'Product Extraction',
      description: 'Verify product data extraction works correctly',
      layer: 'unit',
      tags: ['core', 'extraction'],
      timeout: 10000,
    },
    {
      id: 'core-product-save',
      name: 'Product Save',
      description: 'Verify products can be saved to database',
      layer: 'integration',
      tags: ['core', 'database'],
      timeout: 15000,
    },
    {
      id: 'core-product-list',
      name: 'Product List',
      description: 'Verify products can be listed',
      layer: 'integration',
      tags: ['core', 'database'],
      timeout: 15000,
    },
  ];
}

/**
 * Get crawler regression scenarios
 */
export function getCrawlerRegressionScenarios(): TestScenario[] {
  return [
    {
      id: 'crawler-shopee-search',
      name: 'Shopee Search',
      description: 'Verify Shopee search functionality',
      layer: 'integration',
      tags: ['crawler', 'shopee'],
      timeout: 30000,
    },
    {
      id: 'crawler-shopee-detail',
      name: 'Shopee Item Detail',
      description: 'Verify Shopee item detail extraction',
      layer: 'integration',
      tags: ['crawler', 'shopee'],
      timeout: 30000,
    },
    {
      id: 'crawler-shopee-shop',
      name: 'Shopee Shop Info',
      description: 'Verify Shopee shop info extraction',
      layer: 'integration',
      tags: ['crawler', 'shopee'],
      timeout: 30000,
    },
    {
      id: 'crawler-price-parsing',
      name: 'Price Parsing',
      description: 'Verify price parsing handles various formats',
      layer: 'unit',
      tags: ['crawler', 'parsing'],
      timeout: 10000,
    },
    {
      id: 'crawler-image-extraction',
      name: 'Image Extraction',
      description: 'Verify image URLs are extracted correctly',
      layer: 'unit',
      tags: ['crawler', 'extraction'],
      timeout: 10000,
    },
  ];
}

/**
 * Get AI regression scenarios
 */
export function getAiRegressionScenarios(): TestScenario[] {
  return [
    {
      id: 'ai-enrichment',
      name: 'Product Enrichment',
      description: 'Verify AI enrichment generates valid output',
      layer: 'integration',
      tags: ['ai', 'enrichment'],
      timeout: 60000,
    },
    {
      id: 'ai-hashtag-generation',
      name: 'Hashtag Generation',
      description: 'Verify hashtags are generated correctly',
      layer: 'unit',
      tags: ['ai', 'hashtags'],
      timeout: 30000,
    },
    {
      id: 'ai-description-generation',
      name: 'Description Generation',
      description: 'Verify descriptions meet quality standards',
      layer: 'unit',
      tags: ['ai', 'description'],
      timeout: 30000,
    },
    {
      id: 'ai-rate-limiting',
      name: 'Rate Limiting',
      description: 'Verify AI rate limiting is handled',
      layer: 'integration',
      tags: ['ai', 'rate-limit'],
      timeout: 60000,
    },
  ];
}

/**
 * Get publishing regression scenarios
 */
export function getPublishingRegressionScenarios(): TestScenario[] {
  return [
    {
      id: 'pub-tiktok-publish',
      name: 'TikTok Publishing',
      description: 'Verify TikTok publishing works',
      layer: 'workflow',
      tags: ['publishing', 'tiktok'],
      timeout: 120000,
    },
    {
      id: 'pub-facebook-publish',
      name: 'Facebook Publishing',
      description: 'Verify Facebook publishing works',
      layer: 'workflow',
      tags: ['publishing', 'facebook'],
      timeout: 120000,
    },
    {
      id: 'pub-job-lifecycle',
      name: 'Job Lifecycle',
      description: 'Verify job lifecycle transitions correctly',
      layer: 'integration',
      tags: ['publishing', 'lifecycle'],
      timeout: 30000,
    },
    {
      id: 'pub-retry-handling',
      name: 'Retry Handling',
      description: 'Verify retry logic works correctly',
      layer: 'integration',
      tags: ['publishing', 'retry'],
      timeout: 60000,
    },
    {
      id: 'pub-rate-limiting',
      name: 'Rate Limiting',
      description: 'Verify publishing rate limiting',
      layer: 'integration',
      tags: ['publishing', 'rate-limit'],
      timeout: 60000,
    },
  ];
}

/**
 * Get integration regression scenarios
 */
export function getIntegrationRegressionScenarios(): TestScenario[] {
  return [
    {
      id: 'int-crawler-to-db',
      name: 'Crawler to Database',
      description: 'Verify crawler data flows to database',
      layer: 'workflow',
      tags: ['integration', 'crawler', 'database'],
      timeout: 120000,
    },
    {
      id: 'int-db-to-ai',
      name: 'Database to AI',
      description: 'Verify products flow to AI enrichment',
      layer: 'workflow',
      tags: ['integration', 'database', 'ai'],
      timeout: 120000,
    },
    {
      id: 'int-ai-to-publish',
      name: 'AI to Publishing',
      description: 'Verify enriched content flows to publishing',
      layer: 'workflow',
      tags: ['integration', 'ai', 'publishing'],
      timeout: 120000,
    },
    {
      id: 'int-full-pipeline',
      name: 'Full Pipeline',
      description: 'Verify complete pipeline end-to-end',
      layer: 'e2e',
      tags: ['integration', 'e2e', 'pipeline'],
      timeout: 300000,
    },
  ];
}

/**
 * Get all regression scenarios
 */
export function getAllRegressionScenarios(): TestScenario[] {
  return [
    ...getCoreRegressionScenarios(),
    ...getCrawlerRegressionScenarios(),
    ...getAiRegressionScenarios(),
    ...getPublishingRegressionScenarios(),
    ...getIntegrationRegressionScenarios(),
  ];
}

/**
 * Get regression scenarios by category
 */
export function getRegressionScenariosByCategory(
  category: RegressionCategory
): TestScenario[] {
  const categoryMap: Record<RegressionCategory, () => TestScenario[]> = {
    core: getCoreRegressionScenarios,
    crawler: getCrawlerRegressionScenarios,
    ai: getAiRegressionScenarios,
    publishing: getPublishingRegressionScenarios,
    integration: getIntegrationRegressionScenarios,
  };

  return categoryMap[category]();
}

/**
 * Create full regression pack
 */
export function createFullRegressionPack(): RegressionPack {
  return createRegressionPack(
    'full-regression',
    'Full regression test suite covering all components',
    getAllRegressionScenarios()
  );
}

/**
 * Create quick regression pack
 */
export function createQuickRegressionPack(): RegressionPack {
  return createRegressionPack(
    'quick-regression',
    'Quick regression suite covering core functionality',
    getCoreRegressionScenarios()
  );
}

/**
 * Create category-specific regression pack
 */
export function createCategoryRegressionPack(category: RegressionCategory): RegressionPack {
  const categoryNames: Record<RegressionCategory, string> = {
    core: 'Core Functionality',
    crawler: 'Crawler Module',
    ai: 'AI Module',
    publishing: 'Publishing Module',
    integration: 'Integration Tests',
  };

  return createRegressionPack(
    `${category}-regression`,
    `Regression tests for ${categoryNames[category]}`,
    getRegressionScenariosByCategory(category)
  );
}

/**
 * Set regression baseline
 */
export function setRegressionBaseline(
  pack: RegressionPack,
  passed: number,
  failed: number,
  duration: number
): RegressionPack {
  return {
    ...pack,
    baseline: {
      date: new Date(),
      passed,
      failed,
      duration,
    },
  };
}

/**
 * Get regression pack by name
 */
export function getRegressionPack(name: string): RegressionPack | undefined {
  const packs: Record<string, () => RegressionPack> = {
    'full-regression': createFullRegressionPack,
    'quick-regression': createQuickRegressionPack,
    'core-regression': () => createCategoryRegressionPack('core'),
    'crawler-regression': () => createCategoryRegressionPack('crawler'),
    'ai-regression': () => createCategoryRegressionPack('ai'),
    'publishing-regression': () => createCategoryRegressionPack('publishing'),
    'integration-regression': () => createCategoryRegressionPack('integration'),
  };

  const factory = packs[name];
  return factory ? factory() : undefined;
}

/**
 * List all regression packs
 */
export function listRegressionPacks(): { name: string; scenarioCount: number }[] {
  return [
    { name: 'full-regression', scenarioCount: getAllRegressionScenarios().length },
    { name: 'quick-regression', scenarioCount: getCoreRegressionScenarios().length },
    { name: 'core-regression', scenarioCount: getCoreRegressionScenarios().length },
    { name: 'crawler-regression', scenarioCount: getCrawlerRegressionScenarios().length },
    { name: 'ai-regression', scenarioCount: getAiRegressionScenarios().length },
    { name: 'publishing-regression', scenarioCount: getPublishingRegressionScenarios().length },
    { name: 'integration-regression', scenarioCount: getIntegrationRegressionScenarios().length },
  ];
}
