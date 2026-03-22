/**
 * Pipeline Orchestrator
 *
 * Full workflow: Crawl -> Normalize -> AI Generate -> Save to Database
 */

import { Page, BrowserContext } from 'playwright';

// Config & Environment
import { env } from '../config/env.js';
import logger from '../utils/logger.js'; const log = logger;

// Browser
import { createShopeeBrowserContext, closeBrowser, setupBrowserCleanup } from '../crawler/browser.js';

// Crawler
import {
  crawlFlashSaleProducts,
  crawlSearchProducts,
  crawlProductDetails,
  ShopeeCrawler,
  createShopeeCrawler,
} from '../crawler/shopeeCrawler.js';

// Parsers
import {
  normalizeRawProduct,
  isValidNormalizedProduct,
  parsePrice,
} from '../crawler/parsers.js';

// Types
import type { ShopeeRawProduct, NormalizedProduct } from '../types/product.js';
import type { CreateAffiliateProductDTO } from '../types/database.js';

// AI
import { generateAffiliateContent } from '../ai/geminiService.js';
import type { AffiliateContentOutput } from '../ai/geminiService.js';

// Database
import {
  insertManyAffiliateProducts,
  getAffiliateProductRepository,
} from '../db/affiliateProductRepository.js';

// ============================================
// Types & Interfaces
// ============================================

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  maxProducts: number;
  maxScrolls: number;
  minDelay: number;
  maxDelay: number;
  verbose: boolean;
}

/**
 * Pipeline result
 */
export interface PipelineResult {
  success: boolean;
  crawled: number;
  normalized: number;
  aiProcessed: number;
  saved: number;
  errors: string[];
  duration: number;
}

/**
 * Default pipeline config
 */
const DEFAULT_CONFIG: PipelineConfig = {
  maxProducts: 30,
  maxScrolls: 15,
  minDelay: 500,
  maxDelay: 1500,
  verbose: true,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Log with pipeline context
 */
function pipelineLog(config: PipelineConfig, message: string, meta?: Record<string, unknown>): void {
  if (config.verbose) {
    log.info(`[PIPELINE] ${message}`);
  }
}

/**
 * Normalize raw products to structured format
 */
function normalizeProducts(rawProducts: ShopeeRawProduct[]): NormalizedProduct[] {
  const normalized: NormalizedProduct[] = [];

  for (const raw of rawProducts) {
    try {
      const product = normalizeRawProduct(raw);
      if (isValidNormalizedProduct(product)) {
        normalized.push(product);
      }
    } catch (error) {
      log.warn({ error, product: raw.title }, 'Failed to normalize product');
    }
  }

  return normalized;
}

/**
 * Generate AI content for a single product
 */
async function generateContentForProduct(
  product: NormalizedProduct,
  retryCount: number = 0
): Promise<AffiliateContentOutput | null> {
  try {
    const result = await generateAffiliateContent({
      title: product.title,
      description: product.description,
      price: product.price,
      productUrl: product.productUrl,
      rating: product.rating,
      reviewCount: product.reviewCount,
      soldCount: product.soldCount,
    });

    if (result.success && result.data) {
      return result.data;
    }

    // Retry once on failure
    if (retryCount < 1 && result.error) {
      log.warn({ error: result.error, product: product.title }, 'AI generation failed, retrying...');
      return generateContentForProduct(product, retryCount + 1);
    }

    return null;
  } catch (error) {
    log.error({ error, product: product.title }, 'Error generating AI content');
    return null;
  }
}

/**
 * Map normalized product + AI content to database record
 */
function mapToDatabaseRecord(
  product: NormalizedProduct,
  aiContent: AffiliateContentOutput | null
): CreateAffiliateProductDTO {
  return {
    title: aiContent?.rewrittenTitle || product.title,
    price: product.price,
    image_url: product.imageUrl,
    original_description: product.description || null,
    rewritten_title: aiContent?.rewrittenTitle || null,
    review_content: aiContent?.reviewContent || null,
    social_caption: aiContent?.socialCaption || null,
    hashtags: aiContent?.hashtags ? JSON.stringify(aiContent.hashtags) : null,
    product_url: product.productUrl,
    source_type: product.sourceType,
    source_keyword: product.sourceKeyword,
    crawled_at: product.crawledAt,
    original_price: product.originalPrice || null,
    shop_name: product.shopName || null,
    rating: product.rating || null,
    review_count: product.reviewCount || null,
    sold_count: product.soldCount || null,
    category: product.category || null,
    status: 'pending',
  };
}

// ============================================
// Main Pipeline Functions
// ============================================

/**
 * Run full pipeline for Flash Sale products
 */
export async function runFlashSalePipeline(
  config: Partial<PipelineConfig> = {}
): Promise<PipelineResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const errors: string[] = [];

  log.info('='.repeat(50));
  log.info('Starting Flash Sale Pipeline');
  log.info('='.repeat(50));

  let crawler: ShopeeCrawler | null = null;

  try {
    // Step 1: Initialize browser
    pipelineLog(cfg, 'Initializing browser...');
    crawler = await createShopeeCrawler();
    const page = crawler.getPage();

    if (!page) {
      throw new Error('Failed to create page');
    }

    pipelineLog(cfg, 'Browser initialized successfully');

    // Step 2: Crawl Flash Sale products
    pipelineLog(cfg, 'Crawling Flash Sale products...');
    const crawlResult = await crawlFlashSaleProducts(page, {
      maxProducts: cfg.maxProducts,
      maxScrolls: cfg.maxScrolls,
      minDelay: cfg.minDelay,
      maxDelay: cfg.maxDelay,
    });

    if (!crawlResult.success) {
      throw new Error(`Crawl failed: ${crawlResult.error}`);
    }

    const crawledCount = crawlResult.data.length;
    pipelineLog(cfg, `Crawled ${crawledCount} products`);

    // Step 3: Normalize products
    pipelineLog(cfg, 'Normalizing products...');
    const normalizedProducts = normalizeProducts(crawlResult.data);
    const normalizedCount = normalizedProducts.length;
    pipelineLog(cfg, `Normalized ${normalizedCount} products`);

    // Step 4: Generate AI content
    pipelineLog(cfg, 'Generating AI content...');
    const records: CreateAffiliateProductDTO[] = [];
    let aiProcessedCount = 0;

    for (let i = 0; i < normalizedProducts.length; i++) {
      const product = normalizedProducts[i];

      pipelineLog(cfg, `Processing product ${i + 1}/${normalizedCount}: ${product.title.substring(0, 30)}...`);

      const aiContent = await generateContentForProduct(product);

      if (aiContent) {
        aiProcessedCount++;
      }

      // Map to database record
      const record = mapToDatabaseRecord(product, aiContent);
      records.push(record);

      // Small delay between AI requests
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    pipelineLog(cfg, `AI content generated for ${aiProcessedCount} products`);

    // Step 5: Save to database
    pipelineLog(cfg, 'Saving to database...');
    const savedCount = await insertManyAffiliateProducts(records);
    pipelineLog(cfg, `Saved ${savedCount} products to database`);

    const duration = Date.now() - startTime;

    log.info('='.repeat(50));
    log.info({
      success: true,
      crawled: crawledCount,
      normalized: normalizedCount,
      aiProcessed: aiProcessedCount,
      saved: savedCount,
      duration: `${duration}ms`,
    }, 'Pipeline completed successfully');
    log.info('='.repeat(50));

    return {
      success: true,
      crawled: crawledCount,
      normalized: normalizedCount,
      aiProcessed: aiProcessedCount,
      saved: savedCount,
      errors,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);
    log.error({ error }, 'Pipeline failed');

    return {
      success: false,
      crawled: 0,
      normalized: 0,
      aiProcessed: 0,
      saved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  } finally {
    // Step 6: Cleanup
    if (crawler) {
      await crawler.close();
    }
    await closeBrowser();
    pipelineLog(cfg, 'Browser closed');
  }
}

/**
 * Run full pipeline for search keyword
 */
export async function runSearchPipeline(
  keyword: string,
  config: Partial<PipelineConfig> = {}
): Promise<PipelineResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  const errors: string[] = [];

  log.info('='.repeat(50));
  log.info(`Starting Search Pipeline: "${keyword}"`);
  log.info('='.repeat(50));

  let crawler: ShopeeCrawler | null = null;

  try {
    // Step 1: Initialize browser
    pipelineLog(cfg, 'Initializing browser...');
    crawler = await createShopeeCrawler();
    const page = crawler.getPage();

    if (!page) {
      throw new Error('Failed to create page');
    }

    pipelineLog(cfg, 'Browser initialized successfully');

    // Step 2: Crawl search results
    pipelineLog(cfg, `Crawling search results for: ${keyword}`);
    const crawlResult = await crawlSearchProducts(page, keyword, {
      maxProducts: cfg.maxProducts,
      maxScrolls: cfg.maxScrolls,
      minDelay: cfg.minDelay,
      maxDelay: cfg.maxDelay,
    });

    if (!crawlResult.success) {
      throw new Error(`Crawl failed: ${crawlResult.error}`);
    }

    const crawledCount = crawlResult.data.length;
    pipelineLog(cfg, `Crawled ${crawledCount} products`);

    if (crawledCount === 0) {
      log.warn('No products found');
      return {
        success: true,
        crawled: 0,
        normalized: 0,
        aiProcessed: 0,
        saved: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    // Step 3: Normalize products
    pipelineLog(cfg, 'Normalizing products...');
    const normalizedProducts = normalizeProducts(crawlResult.data);
    const normalizedCount = normalizedProducts.length;
    pipelineLog(cfg, `Normalized ${normalizedCount} products`);

    // Step 4: Generate AI content
    pipelineLog(cfg, 'Generating AI content...');
    const records: CreateAffiliateProductDTO[] = [];
    let aiProcessedCount = 0;

    for (let i = 0; i < normalizedProducts.length; i++) {
      const product = normalizedProducts[i];

      pipelineLog(cfg, `Processing product ${i + 1}/${normalizedCount}: ${product.title.substring(0, 30)}...`);

      const aiContent = await generateContentForProduct(product);

      if (aiContent) {
        aiProcessedCount++;
      }

      // Map to database record
      const record = mapToDatabaseRecord(product, aiContent);
      records.push(record);

      // Small delay between AI requests
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    pipelineLog(cfg, `AI content generated for ${aiProcessedCount} products`);

    // Step 5: Save to database
    pipelineLog(cfg, 'Saving to database...');
    const savedCount = await insertManyAffiliateProducts(records);
    pipelineLog(cfg, `Saved ${savedCount} products to database`);

    const duration = Date.now() - startTime;

    log.info('='.repeat(50));
    log.info({
      keyword,
      success: true,
      crawled: crawledCount,
      normalized: normalizedCount,
      aiProcessed: aiProcessedCount,
      saved: savedCount,
      duration: `${duration}ms`,
    }, 'Pipeline completed successfully');
    log.info('='.repeat(50));

    return {
      success: true,
      crawled: crawledCount,
      normalized: normalizedCount,
      aiProcessed: aiProcessedCount,
      saved: savedCount,
      errors,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);
    log.error({ error, keyword }, 'Pipeline failed');

    return {
      success: false,
      crawled: 0,
      normalized: 0,
      aiProcessed: 0,
      saved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  } finally {
    // Step 6: Cleanup
    if (crawler) {
      await crawler.close();
    }
    await closeBrowser();
    pipelineLog(cfg, 'Browser closed');
  }
}

/**
 * Run pipeline for multiple keywords
 */
export async function runMultiSearchPipeline(
  keywords: string[],
  config: Partial<PipelineConfig> = {}
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const keyword of keywords) {
    const result = await runSearchPipeline(keyword, config);
    results.push(result);

    // Delay between keywords
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return results;
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Main function for CLI usage
 */
async function main() {
  // Setup cleanup handlers
  setupBrowserCleanup();

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'flash-sale':
      case 'flash':
        log.info('Running Flash Sale pipeline...');
        await runFlashSalePipeline({ verbose: true });
        break;

      case 'search':
        const keyword = args[1];
        if (!keyword) {
          console.error('Usage: npm run pipeline -- search <keyword>');
          process.exit(1);
        }
        log.info(`Running Search pipeline for: ${keyword}`);
        await runSearchPipeline(keyword, { verbose: true });
        break;

      case 'multi':
        const keywords = args.slice(1);
        if (keywords.length === 0) {
          console.error('Usage: npm run pipeline -- multi <keyword1> <keyword2> ...');
          process.exit(1);
        }
        log.info(`Running Multi Search pipeline for: ${keywords.join(', ')}`);
        await runMultiSearchPipeline(keywords, { verbose: true });
        break;

      default:
        console.log(`
Affiliate Automation Pipeline

Usage:
  npm run pipeline -- flash-sale    # Crawl Flash Sale
  npm run pipeline -- search <kw>  # Crawl by keyword
  npm run pipeline -- multi <kw1> <kw2> ...  # Multiple keywords
        `);
        process.exit(1);
    }
  } catch (error) {
    log.error({ error }, 'Pipeline execution failed');
    process.exit(1);
  }

  process.exit(0);
}

// Run if executed directly
main();

