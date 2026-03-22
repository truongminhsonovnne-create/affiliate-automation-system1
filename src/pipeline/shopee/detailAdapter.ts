/**
 * Shopee Pipeline - Detail Adapter
 *
 * Unified detail extraction interface for Shopee crawl pipeline.
 */

import type { Browser, Page, BrowserContext } from 'playwright';
import type { PipelineLogger, ShopeeCanonicalProduct } from './types.js';
import type {
  ShopeeProductDetailExtractor,
  ShopeeDetailExtractionOptions,
} from '../extraction/shopeeProductDetailExtractor.js';

export interface DetailAdapterResult {
  /** Extracted product */
  product: ShopeeCanonicalProduct;

  /** Extraction duration */
  durationMs: number;
}

export interface DetailAdapterOptions {
  /** Browser context */
  context: BrowserContext;

  /** Detail extractor instance */
  extractor: ShopeeProductDetailExtractor;

  /** Product URL to extract */
  productUrl: string;

  /** Source type */
  sourceType: string;

  /** Source keyword (if applicable) */
  sourceKeyword?: string;

  /** Extraction timeout */
  timeout?: number;

  /** Custom logger */
  logger?: PipelineLogger;
}

/**
 * Unified detail extraction adapter
 */
export class ShopeeDetailAdapter {
  private extractor: ShopeeProductDetailExtractor;
  private logger?: PipelineLogger;

  constructor(options: {
    extractor: ShopeeProductDetailExtractor;
    logger?: PipelineLogger;
  }) {
    this.extractor = options.extractor;
    this.logger = options.logger;
  }

  /**
   * Extract product details from URL
   */
  async extract(options: DetailAdapterOptions): Promise<DetailAdapterResult> {
    const startTime = Date.now();
    const { context, productUrl, sourceType, sourceKeyword, timeout = 30000 } = options;

    this.logger?.debug('Starting detail extraction', {
      url: productUrl,
      sourceType,
    });

    // Create new page for extraction
    const page = await context.newPage();

    try {
      const extractionOptions: ShopeeDetailExtractionOptions = {
        page,
        productUrl,
        timeout,
      };

      const extracted = await this.extractor.extract(extractionOptions);

      // Enrich with source information
      const enrichedProduct: ShopeeCanonicalProduct = {
        ...extracted,
        sourceType,
        sourceKeyword,
        discoveredAt: extracted.discoveredAt || Date.now(),
        detailedAt: Date.now(),
      };

      this.logger?.debug('Detail extraction complete', {
        url: productUrl,
        title: enrichedProduct.title?.substring(0, 50),
        durationMs: Date.now() - startTime,
      });

      return {
        product: enrichedProduct,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error('Detail extraction failed', {
        url: productUrl,
        error: errorMessage,
      });

      throw new Error(`Failed to extract details: ${errorMessage}`);
    } finally {
      await page.close();
    }
  }

  /**
   * Extract multiple products with concurrency control
   */
  async extractBatch(
    options: {
      context: BrowserContext;
      products: Array<{
        productUrl: string;
        sourceType: string;
        sourceKeyword?: string;
      }>;
      concurrency: number;
      timeout?: number;
    }
  ): Promise<{
    succeeded: Array<DetailAdapterResult>;
    failed: Array<{ url: string; error: string }>;
  }> {
    const { context, products, concurrency, timeout = 30000 } = options;
    const succeeded: Array<DetailAdapterResult> = [];
    const failed: Array<{ url: string; error: string }> = [];

    // Process with controlled concurrency
    for (let i = 0; i < products.length; i += concurrency) {
      const batch = products.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (product) => {
          const result = await this.extract({
            context,
            productUrl: product.productUrl,
            sourceType: product.sourceType,
            sourceKeyword: product.sourceKeyword,
            extractor: this.extractor,
            timeout,
          });

          return { product, result };
        })
      );

      // Collect results
      for (let j = 0; j < batchResults.length; j++) {
        const batchResult = batchResults[j];

        if (batchResult.status === 'fulfilled') {
          succeeded.push(batchResult.value.result);
        } else {
          failed.push({
            url: batch[j].productUrl,
            error: batchResult.reason instanceof Error
              ? batchResult.reason.message
              : String(batchResult.reason),
          });
        }
      }

      this.logger?.debug('Batch extraction progress', {
        processed: Math.min(i + concurrency, products.length),
        total: products.length,
        succeeded: succeeded.length,
        failed: failed.length,
      });
    }

    return { succeeded, failed };
  }
}

/**
 * Create detail adapter
 */
export function createDetailAdapter(
  extractor: ShopeeProductDetailExtractor,
  logger?: PipelineLogger
): ShopeeDetailAdapter {
  return new ShopeeDetailAdapter({ extractor, logger });
}
