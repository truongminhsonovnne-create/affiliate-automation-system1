/**
 * Shopee Pipeline - Main Crawl Pipeline Orchestrator
 *
 * Top-level orchestration for Shopee crawl pipeline with persistence integration.
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type {
  ShopeePipelineRunOptions,
  ShopeePipelineRunResult,
  ShopeePipelineStage,
  ShopeeCanonicalProduct,
  ShopeeDetailProcessingItem,
  PipelineLogger,
  ShopeeQualityGateResult,
} from './types.js';

import { createShopeeBrowserManager, type ShopeeBrowserManager } from './browserManager.js';
import { createDiscoveryAdapter, type ShopeeDiscoveryAdapter } from './discoveryAdapter.js';
import { createDetailAdapter, type ShopeeDetailAdapter } from './detailAdapter.js';
import { executeBatch, executeWithRetry } from './batchExecution.js';
import { evaluateShopeeProductQuality, shouldPersistShopeeProduct, buildQualityGateSummary } from './qualityGate.js';
import { persistShopeeProducts } from './persistence.js';
import {
  startShopeeCrawlJob,
  markShopeeCrawlJobStarted,
  markShopeeCrawlJobSuccess,
  markShopeeCrawlJobPartialSuccess,
  markShopeeCrawlJobFailed,
} from './jobLifecycle.js';
import { createResultBuilder, buildPipelineError, buildPipelineWarning } from './resultBuilder.js';

import { PIPELINE_DISCOVERY, PIPELINE_DETAIL, PIPELINE_QUALITY, PIPELINE_PERSISTENCE, PIPELINE_TIMEOUT } from './constants.js';

import type { AffiliateProductRepository } from '../../repositories/affiliateProductRepository.js';
import type { CrawlJobRepository } from '../../repositories/crawlJobRepository.js';

import type { ShopeeListingDiscovery } from '../discovery/shopeeListingDiscovery.js';
import type { ShopeeProductDetailExtractor } from '../extraction/shopeeProductDetailExtractor.js';

/**
 * Pipeline dependencies
 */
export interface ShopeePipelineDependencies {
  /** Browser manager */
  browserManager: ShopeeBrowserManager;

  /** Discovery layer */
  discovery: ShopeeListingDiscovery;

  /** Detail extractor */
  detailExtractor: ShopeeProductDetailExtractor;

  /** Affiliate product repository */
  affiliateProductRepository: AffiliateProductRepository;

  /** Crawl job repository */
  crawlJobRepository: CrawlJobRepository;
}

/**
 * Shopee crawl pipeline orchestrator
 */
export class ShopeeCrawlPipeline {
  private deps: ShopeePipelineDependencies;
  private logger?: PipelineLogger;

  constructor(deps: ShopeePipelineDependencies, logger?: PipelineLogger) {
    this.deps = deps;
    this.logger = logger;
  }

  /**
   * Run flash sale pipeline
   */
  async runFlashSalePipeline(
    options: Omit<ShopeePipelineRunOptions, 'mode'> = {}
  ): Promise<ShopeePipelineRunResult> {
    return this.runPipeline({
      ...options,
      mode: 'flash_sale',
    });
  }

  /**
   * Run search pipeline
   */
  async runSearchPipeline(
    keyword: string,
    options: Omit<ShopeePipelineRunOptions, 'mode' | 'keyword'> = {}
  ): Promise<ShopeePipelineRunResult> {
    return this.runPipeline({
      ...options,
      mode: 'search',
      keyword,
    });
  }

  /**
   * Main pipeline execution
   */
  async runPipeline(options: ShopeePipelineRunOptions): Promise<ShopeePipelineRunResult> {
    const startTime = Date.now();
    const { mode, jobId } = options;

    // Create result builder
    const resultBuilder = createResultBuilder({
      runOptions: options,
      startTime,
    });

    // Initialize browser and context
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      this.logger?.info('Starting Shopee crawl pipeline', { mode, keyword: options.keyword });

      // ============================================
      // Stage: Browser Setup
      // ============================================
      const stageStartTime = Date.now();
      this.logger?.debug('Setting up browser...');

      const browserManager = this.deps.browserManager;
      browser = await browserManager.launch();
      context = await browser.newContext({
        locale: 'vi-VN',
        timezoneId: 'Asia/Ho_Chi_Minh',
      });
      page = await context.newPage();

      resultBuilder.setBrowserUsed(true);
      resultBuilder.incrementPagesCreated(2);
      resultBuilder.setStageDuration('browser_setup', Date.now() - stageStartTime);

      // ============================================
      // Stage: Job Lifecycle - Start
      // ============================================
      let currentJobId = jobId;
      if (!currentJobId && this.deps.crawlJobRepository) {
        const jobResult = await startShopeeCrawlJob(
          this.deps.crawlJobRepository,
          mode,
          {
            keyword: options.keyword,
            logger: this.logger,
          }
        );

        if (jobResult.ok && jobResult.jobId) {
          currentJobId = jobResult.jobId;
          resultBuilder.addWarning({
            code: 'JOB_CREATED',
            message: `Crawl job created: ${jobResult.jobId}`,
            severity: 'info',
            stage: 'initialization',
          });
        }
      }

      if (currentJobId) {
        await markShopeeCrawlJobStarted(this.deps.crawlJobRepository, currentJobId, { logger: this.logger });
      }

      // ============================================
      // Stage: Discovery
      // ============================================
      const discoveryStageStart = Date.now();
      this.logger?.debug('Starting discovery stage...');

      const discoveryAdapter = createDiscoveryAdapter(this.deps.discovery, this.logger);

      let discoveryItems: Array<{
        productUrl: string;
        positionIndex: number;
        metadata?: Record<string, unknown>;
      }> = [];

      if (options.skipDiscovery && options.preLoadedItems) {
        // Use pre-loaded items
        discoveryItems = options.preLoadedItems.map((item, index) => ({
          productUrl: item.productUrl,
          positionIndex: index,
          metadata: item.metadata,
        }));
        resultBuilder.setDiscoveryCardsFound(discoveryItems.length);
        resultBuilder.setDiscoveryCardsAccepted(discoveryItems.length);
      } else {
        // Execute discovery
        const discoveryResult = await discoveryAdapter.discover({
          browser,
          page,
          mode,
          keyword: options.keyword,
          maxItems: options.maxDiscoveryItems || PIPELINE_DISCOVERY.DEFAULT_MAX_ITEMS,
          logger: this.logger,
        });

        discoveryItems = discoveryResult.items;
        resultBuilder.setDiscoveryCardsFound(discoveryResult.totalFound);
        resultBuilder.setDiscoveryCardsAccepted(discoveryItems.length);
        resultBuilder.setFinalSourceUrl(discoveryResult.sourceUrl);
      }

      this.logger?.info('Discovery complete', {
        found: resultBuilder['_discoveryCardsFound'],
        accepted: discoveryItems.length,
      });

      resultBuilder.setStageDuration('discovery', Date.now() - discoveryStageStart);

      // ============================================
      // Stage: Detail Extraction
      // ============================================
      const detailStageStart = Date.now();
      this.logger?.debug('Starting detail extraction stage...');

      const detailAdapter = createDetailAdapter(this.deps.detailExtractor, this.logger);

      const maxDetailItems = Math.min(
        options.maxDetailItems || PIPELINE_DETAIL.DEFAULT_MAX_ITEMS,
        discoveryItems.length
      );

      const itemsToProcess = discoveryItems.slice(0, maxDetailItems);

      // Build processing items
      const processingItems: ShopeeDetailProcessingItem[] = itemsToProcess.map(item => ({
        productUrl: item.productUrl,
        sourceType: mode === 'flash_sale' ? 'flash_sale' : 'search',
        sourceKeyword: options.keyword,
        positionIndex: item.positionIndex,
        discoveredAt: item.metadata?.discoveredAt as number | undefined,
      }));

      // Execute detail extraction with concurrency
      const extractedProducts: ShopeeCanonicalProduct[] = [];
      const maxConcurrentWorkers = Math.min(
        options.maxConcurrentWorkers || PIPELINE_DETAIL.DEFAULT_CONCURRENT_WORKERS,
        PIPELINE_DETAIL.MAX_CONCURRENT_WORKERS
      );

      const detailResults = await executeBatch({
        items: processingItems,
        concurrency: maxConcurrentWorkers,
        execute: async (item) => {
          resultBuilder.incrementDetailAttempts();

          try {
            const extractionOptions = {
              context: context!,
              extractor: this.deps.detailExtractor,
              productUrl: item.productUrl,
              sourceType: item.sourceType,
              sourceKeyword: item.sourceKeyword,
              timeout: PIPELINE_DETAIL.EXTRACTION_TIMEOUT,
              logger: this.logger,
            };

            const detailResult = await detailAdapter.extract(extractionOptions);

            resultBuilder.incrementDetailSuccesses();
            return { ok: true, result: detailResult.product };
          } catch (error) {
            resultBuilder.incrementDetailFailures();
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { ok: false, error: errorMessage };
          }
        },
        logger: this.logger,
      });

      // Collect successfully extracted products
      for (const result of detailResults.results) {
        if (result.ok && result.result) {
          extractedProducts.push(result.result);
        }
      }

      this.logger?.info('Detail extraction complete', {
        attempted: detailResults.total,
        succeeded: detailResults.succeeded,
        failed: detailResults.failed,
      });

      resultBuilder.setStageDuration('detail_extraction', Date.now() - detailStageStart);

      // ============================================
      // Stage: Quality Gate
      // ============================================
      const qualityStageStart = Date.now();
      this.logger?.debug('Starting quality gate stage...');

      const qualityResults: ShopeeQualityGateResult[] = [];
      const productsToPersist: Array<{
        product: ShopeeCanonicalProduct;
        qualityResult: ShopeeQualityGateResult;
      }> = [];

      for (const product of extractedProducts) {
        const qualityResult = evaluateShopeeProductQuality(product, {
          minQualityScore: options.minQualityScore || PIPELINE_QUALITY.MIN_QUALITY_SCORE,
          logger: this.logger,
        });

        qualityResults.push(qualityResult);

        if (qualityResult.pass) {
          resultBuilder.incrementQualityAccepted();
          productsToPersist.push({ product, qualityResult });
        } else {
          resultBuilder.incrementQualityRejected();
        }
      }

      const qualitySummary = buildQualityGateSummary(qualityResults);
      this.logger?.info('Quality gate complete', {
        total: qualitySummary.total,
        passed: qualitySummary.passed,
        failed: qualitySummary.failed,
        averageScore: qualitySummary.averageScore,
      });

      resultBuilder.setStageDuration('quality_gate', Date.now() - qualityStageStart);

      // ============================================
      // Stage: Persistence
      // ============================================
      const persistenceStageStart = Date.now();

      if (options.enablePersistence !== false && productsToPersist.length > 0) {
        this.logger?.debug('Starting persistence stage...');

        const persistenceResult = await persistShopeeProducts(
          this.deps.affiliateProductRepository,
          productsToPersist.map(p => p.product),
          {
            batchSize: PIPELINE_PERSISTENCE.BATCH_SIZE,
            logger: this.logger,
          }
        );

        // Update persistence counters
        resultBuilder.setPersistenceCounters(persistenceResult.counters);

        this.logger?.info('Persistence complete', {
          inserted: persistenceResult.counters.inserted,
          updated: persistenceResult.counters.updated,
          skipped: persistenceResult.counters.skipped,
          failed: persistenceResult.counters.failed,
        });
      } else {
        this.logger?.debug('Persistence skipped (disabled or no products)');
      }

      resultBuilder.setStageDuration('persistence', Date.now() - persistenceStageStart);

      // ============================================
      // Stage: Finalization
      // ============================================
      resultBuilder.setJobCompleted(true);
      resultBuilder.setStageDuration('finalization', Date.now() - startTime);

      // Determine final status
      const successRate = detailResults.total > 0
        ? detailResults.succeeded / detailResults.total
        : 0;

      let status: 'success' | 'partial_success' | 'failed';

      if (detailResults.succeeded === 0) {
        status = 'failed';
      } else if (successRate >= 0.7 || detailResults.succeeded >= PIPELINE_DISCOVERY.MIN_ITEMS_SUCCESS) {
        status = 'success';
      } else {
        status = 'partial_success';
      }

      // Mark job as complete
      if (currentJobId) {
        if (status === 'success') {
          await markShopeeCrawlJobSuccess(
            this.deps.crawlJobRepository,
            currentJobId,
            {
              totalItems: detailResults.total,
              processedItems: detailResults.succeeded + detailResults.failed,
              successItems: detailResults.succeeded,
              failedItems: detailResults.failed,
              metadata: {
                qualityAverage: qualitySummary.averageScore,
                persisted: resultBuilder['_persistedInserted'] + resultBuilder['_persistedUpdated'],
              },
              logger: this.logger,
            }
          );
        } else if (status === 'partial_success') {
          await markShopeeCrawlJobPartialSuccess(
            this.deps.crawlJobRepository,
            currentJobId,
            {
              totalItems: detailResults.total,
              processedItems: detailResults.succeeded + detailResults.failed,
              successItems: detailResults.succeeded,
              failedItems: detailResults.failed,
              errorMessage: `Partial success: ${detailResults.succeeded}/${detailResults.total} succeeded`,
              logger: this.logger,
            }
          );
        } else {
          await markShopeeCrawlJobFailed(
            this.deps.crawlJobRepository,
            currentJobId,
            {
              errorMessage: 'All detail extraction attempts failed',
              logger: this.logger,
            }
          );
        }
      }

      this.logger?.info('Pipeline complete', {
        status,
        durationMs: Date.now() - startTime,
      });

      return resultBuilder.build(status);

    } catch (error) {
      const pipelineError = buildPipelineError(error, {
        code: 'PIPELINE_ERROR',
        stage: 'initialization',
        recoverable: false,
      });

      resultBuilder.addError(pipelineError);
      resultBuilder.setJobCompleted(false);

      // Mark job as failed
      if (currentJobId) {
        await markShopeeCrawlJobFailed(
          this.deps.crawlJobRepository,
          currentJobId,
          {
            errorMessage: pipelineError.message,
            logger: this.logger,
          }
        );
      }

      this.logger?.error('Pipeline failed', {
        error: pipelineError.message,
        stack: pipelineError.stack,
      });

      return resultBuilder.build('failed');

    } finally {
      // Cleanup
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }
}

/**
 * Create Shopee crawl pipeline
 */
export function createShopeeCrawlPipeline(
  deps: ShopeePipelineDependencies,
  logger?: PipelineLogger
): ShopeeCrawlPipeline {
  return new ShopeeCrawlPipeline(deps, logger);
}

/**
 * Convenience function to run flash sale pipeline
 */
export async function runShopeeFlashSalePipeline(
  deps: ShopeePipelineDependencies,
  options: Omit<ShopeePipelineRunOptions, 'mode'> = {},
  logger?: PipelineLogger
): Promise<ShopeePipelineRunResult> {
  const pipeline = createShopeeCrawlPipeline(deps, logger);
  return pipeline.runFlashSalePipeline(options);
}

/**
 * Convenience function to run search pipeline
 */
export async function runShopeeSearchPipeline(
  deps: ShopeePipelineDependencies,
  keyword: string,
  options: Omit<ShopeePipelineRunOptions, 'mode' | 'keyword'> = {},
  logger?: PipelineLogger
): Promise<ShopeePipelineRunResult> {
  const pipeline = createShopeeCrawlPipeline(deps, logger);
  return pipeline.runSearchPipeline(keyword, options);
}
