import { ShopeeCrawler } from '../crawler/shopeeCrawler.js';
import { getGeminiService } from '../ai/geminiService.js';
import { getAffiliateProductRepository } from '../db/affiliateProductRepository.js';
import { closeBrowser, setupBrowserCleanup } from '../crawler/browser.js';
import { log } from '../utils/logger.js';
import { SearchQuery, AffiliateProduct } from '../types/product.js';
import { env } from '../config/env.js';

export interface PipelineConfig {
  searchQueries: SearchQuery[];
  maxProductsPerQuery: number;
  batchSize: number;
  minConfidenceScore: number;
}

export interface PipelineResult {
  success: boolean;
  totalCrawled: number;
  totalAnalyzed: number;
  totalSaved: number;
  errors: string[];
}

/**
 * Main orchestrator for the affiliate automation pipeline
 */
export class AffiliatePipeline {
  private crawler: ShopeeCrawler | null = null;
  private repository = getAffiliateProductRepository();
  private aiService = getGeminiService();
  private config: PipelineConfig;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      searchQueries: config.searchQueries || [],
      maxProductsPerQuery: config.maxProductsPerQuery || 50,
      batchSize: config.batchSize || env.AI_ANALYSIS_BATCH_SIZE,
      minConfidenceScore: config.minConfidenceScore || env.AI_CONFIDENCE_THRESHOLD,
    };

    // Setup cleanup
    setupBrowserCleanup();
  }

  /**
   * Initialize pipeline resources
   */
  async init(): Promise<void> {
    log.info('Initializing affiliate pipeline...');

    // Test AI connection
    const aiConnected = await this.aiService.testConnection();
    if (!aiConnected) {
      throw new Error('Failed to connect to Gemini AI');
    }

    log.info('Pipeline initialized successfully');
  }

  /**
   * Run the complete pipeline
   */
  async run(): Promise<PipelineResult> {
    const result: PipelineResult = {
      success: false,
      totalCrawled: 0,
      totalAnalyzed: 0,
      totalSaved: 0,
      errors: [],
    };

    try {
      await this.init();

      // Initialize crawler
      this.crawler = new ShopeeCrawler();
      await this.crawler.init();

      log.info({ queries: this.config.searchQueries.length }, 'Starting crawl phase');

      // Crawl products from all queries
      for (const query of this.config.searchQueries) {
        try {
          log.info({ query }, 'Crawling products for query');

          const crawlResult = await this.crawler.crawl(query, this.config.maxProductsPerQuery);

          if (!crawlResult.success) {
            result.errors.push(`Crawl failed for query "${query.keywords.join(' ')}": ${crawlResult.error}`);
            continue;
          }

          result.totalCrawled += crawlResult.products.length;

          // Transform and save crawled products
          const products = await this.transformAndSaveProducts(crawlResult.products, query.platform);
          result.totalSaved += products.length;

          // Analyze products with AI in batches
          const analyzedCount = await this.analyzeProducts(products);
          result.totalAnalyzed += analyzedCount;

          log.info(
            { crawled: crawlResult.products.length, saved: products.length, analyzed: analyzedCount },
            'Query completed'
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Error processing query "${query.keywords.join(' ')}": ${errorMsg}`);
          log.error({ error, query }, 'Query processing failed');
        }
      }

      result.success = true;
      log.info(result, 'Pipeline completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Pipeline error: ${errorMsg}`);
      log.error({ error }, 'Pipeline failed');
    } finally {
      await this.cleanup();
    }

    return result;
  }

  /**
   * Transform crawled products and save to database
   */
  private async transformAndSaveProducts(
    crawledProducts: Array<{ rawTitle: string; rawPrice: string; rawUrl: string; rawImage: string }>,
    platform: string
  ): Promise<AffiliateProduct[]> {
    const products: Array<Omit<AffiliateProduct, 'id' | 'createdAt' | 'updatedAt'>> = crawledProducts.map((c) => ({
      externalId: c.rawUrl,
      platform: platform as AffiliateProduct['platform'],
      title: c.rawTitle,
      price: this.parsePrice(c.rawPrice),
      currency: 'VND',
      images: c.rawImage ? [c.rawImage] : [],
      url: c.rawUrl,
      status: 'pending',
    }));

    // Save to database
    const savedCount = await this.repository.createBatch(products);

    log.debug({ saved: savedCount }, 'Products saved to database');

    // Fetch saved products
    const result = await this.repository.findAll({ status: 'pending' }, { page: 1, limit: savedCount });

    return result.data;
  }

  /**
   * Analyze products with AI in batches
   */
  private async analyzeProducts(products: AffiliateProduct[]): Promise<number> {
    let analyzedCount = 0;

    for (let i = 0; i < products.length; i += this.config.batchSize) {
      const batch = products.slice(i, i + this.config.batchSize);

      try {
        // Update status to analyzing
        for (const product of batch) {
          await this.repository.updateStatus(product.id!, 'analyzing');
        }

        // Analyze with AI
        const analysisRequest = {
          products: batch.map((p) => ({
            title: p.title,
            price: p.price,
            images: p.images,
          })),
        };

        const analysisResult = await this.aiService.analyzeBatch(analysisRequest);

        // Update products with analysis
        for (const result of analysisResult.results) {
          const product = batch.find((p) => p.title === result.externalId);
          if (product && product.id) {
            await this.repository.updateAIAnalysis(product.id, result);
            analyzedCount++;
          }
        }

        log.debug({ batchSize: batch.length, analyzed: analysisResult.successCount }, 'Batch analyzed');
      } catch (error) {
        log.error({ error, batchSize: batch.length }, 'Batch analysis failed');

        // Mark as error
        for (const product of batch) {
          await this.repository.updateStatus(product.id!, 'error', 'AI analysis failed');
        }
      }
    }

    return analyzedCount;
  }

  /**
   * Parse price string to number
   */
  private parsePrice(priceStr: string): number {
    // Remove non-numeric characters except dot
    const cleaned = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.crawler) {
      await this.crawler.close();
    }
    await closeBrowser();
    log.info('Pipeline cleanup completed');
  }
}

/**
 * Run pipeline with default config
 */
export async function runPipeline(config?: Partial<PipelineConfig>): Promise<PipelineResult> {
  const pipeline = new AffiliatePipeline(config);
  return pipeline.run();
}

export default AffiliatePipeline;
