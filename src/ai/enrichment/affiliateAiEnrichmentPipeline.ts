/**
 * AI Enrichment Pipeline - Main Orchestrator
 *
 * Top-level orchestration for AI content enrichment.
 */

import type {
  AffiliateAiContentType,
  AiEnrichmentRunOptions,
  AiEnrichmentRunResult,
  AiEnrichmentItemResult,
  AffiliateProductInput,
  AffiliateContentOutput,
  AiEnrichmentLogger,
  AiEnrichmentStage,
} from './types.js';

import { GEMINI_CONFIG, BATCH_CONFIG, PROMPT_CONFIG } from './constants.js';
import { buildAffiliateReviewPrompt, getPromptVersion } from './prompts.js';
import { createGeminiClient, buildGeminiContents } from './geminiClient.js';
import { safeParseAffiliateContent } from './parser.js';
import { validateAffiliateContentOutput } from './schemas.js';
import { evaluateAffiliateAiContentQuality, shouldPersistAffiliateAiContent } from './qualityGate.js';
import { isProductEligibleForAiEnrichment, buildAiEnrichmentEligibilityResult } from './eligibility.js';
import { loadAffiliateProductsForEnrichment, loadAffiliateProductForEnrichment } from './productLoader.js';
import { persistAffiliateAiContent, persistManyAffiliateAiContents } from './persistence.js';
import { createAiEnrichmentResultBuilder, buildAiEnrichmentError, buildAiEnrichmentWarning } from './resultBuilder.js';

import type { AffiliateProductRepository } from '../../db/repositories/affiliateProductRepository.js';
import type { AffiliateContentRepository } from '../../db/repositories/affiliateContentRepository.js';

/**
 * AI Enrichment Pipeline Dependencies
 */
export interface AiEnrichmentPipelineDependencies {
  /** Affiliate product repository */
  affiliateProductRepository: AffiliateProductRepository;

  /** Affiliate content repository */
  affiliateContentRepository: AffiliateContentRepository;

  /** Gemini API key (optional if using env) */
  geminiApiKey?: string;

  /** Gemini model (optional) */
  geminiModel?: string;
}

/**
 * Affiliate AI Enrichment Pipeline
 */
export class AffiliateAiEnrichmentPipeline {
  private deps: AiEnrichmentPipelineDependencies;
  private logger?: AiEnrichmentLogger;

  constructor(deps: AiEnrichmentPipelineDependencies, logger?: AiEnrichmentLogger) {
    this.deps = deps;
    this.logger = logger;
  }

  /**
   * Run AI enrichment for a single product
   */
  async runForProduct(
    productId: string,
    options: {
      contentType?: AffiliateAiContentType;
      promptVersion?: string;
      model?: string;
      temperature?: number;
      enablePersistence?: boolean;
    } = {}
  ): Promise<AiEnrichmentRunResult> {
    const startTime = Date.now();
    const contentType = options.contentType || 'affiliate_review';
    const model = options.model || process.env.GEMINI_MODEL || GEMINI_CONFIG.DEFAULT_MODEL;
    const promptVersion = options.promptVersion || PROMPT_CONFIG.CURRENT_AFFILIATE_REVIEW_VERSION;

    const resultBuilder = createAiEnrichmentResultBuilder({
      contentType,
      model,
      promptVersion,
      startTime,
      logger: this.logger,
    });

    try {
      // Load product
      this.logger?.info('Loading product', { productId });

      const product = await loadAffiliateProductForEnrichment(
        productId,
        this.deps.affiliateProductRepository,
        { logger: this.logger }
      );

      if (!product) {
        resultBuilder.addError(buildAiEnrichmentError(new Error('Product not found'), {
          code: 'PRODUCT_NOT_FOUND',
          stage: 'product_loading',
          productId,
          recoverable: false,
        }));

        return resultBuilder.build('failed');
      }

      resultBuilder.setLoaded(1);

      // Check eligibility
      const eligibility = buildAiEnrichmentEligibilityResult(product, { logger: this.logger });

      if (!eligibility.eligible) {
        this.logger?.warn('Product not eligible', {
          productId,
          reason: eligibility.reason,
        });

        resultBuilder.setEligible(0);
        resultBuilder.addWarning(buildAiEnrichmentWarning(`Product not eligible: ${eligibility.reason}`, {
          code: 'NOT_ELIGIBLE',
          stage: 'eligibility_check',
          productId,
        }));

        return resultBuilder.build('failed');
      }

      resultBuilder.setEligible(1);

      // Build prompt
      const promptResult = buildAffiliateReviewPrompt(product, { version: promptVersion });

      // Call Gemini
      const geminiClient = createGeminiClient({
        apiKey: this.deps.geminiApiKey || process.env.GEMINI_API_KEY,
        model,
        logger: this.logger,
      });

      const request = buildGeminiContents(promptResult.systemInstruction, promptResult.userPrompt);

      resultBuilder.incrementTotalApiCalls();

      const geminiResult = await geminiClient.generateContent(request, {
        temperature: options.temperature,
        retries: GEMINI_CONFIG.DEFAULT_TEMPERATURE > 0 ? 2 : 0,
      });

      if (!geminiResult.ok || !geminiResult.text) {
        resultBuilder.incrementFailedApiCalls();

        this.logger?.error('Gemini API call failed', {
          productId,
          error: geminiResult.error,
        });

        resultBuilder.addError(buildAiEnrichmentError(new Error(geminiResult.error || 'API call failed'), {
          code: 'GEMINI_API_ERROR',
          stage: 'gemini_api_call',
          productId,
        }));

        return resultBuilder.build('failed');
      }

      resultBuilder.incrementSuccessfulApiCalls();
      resultBuilder.addGenerationDuration(geminiResult.metadata.durationMs);

      // Parse response
      const parsed = safeParseAffiliateContent(geminiResult.text, { logger: this.logger });

      if (!parsed.ok || !parsed.data) {
        resultBuilder.incrementParseFailures();

        this.logger?.warn('Failed to parse Gemini response', {
          productId,
          error: parsed.error,
        });

        resultBuilder.addError(buildAiEnrichmentError(new Error(parsed.error || 'Parse failed'), {
          code: 'PARSE_ERROR',
          stage: 'parsing',
          productId,
          recoverable: true,
        }));

        return resultBuilder.build('failed');
      }

      // Validate schema
      const validation = validateAffiliateContentOutput(parsed.data);

      if (!validation.ok) {
        resultBuilder.incrementValidationFailures();

        this.logger?.warn('Schema validation failed', {
          productId,
          errors: validation.errors,
        });

        resultBuilder.addError(buildAiEnrichmentError(new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`), {
          code: 'VALIDATION_ERROR',
          stage: 'validation',
          productId,
          recoverable: true,
        }));

        return resultBuilder.build('failed');
      }

      // Quality gate
      const qualityResult = evaluateAffiliateAiContentQuality(parsed.data, { product }, { logger: this.logger });

      if (!qualityResult.pass) {
        this.logger?.warn('Quality gate failed', {
          productId,
          score: qualityResult.score,
          reasons: qualityResult.rejectReasons,
        });

        resultBuilder.addWarning(buildAiEnrichmentWarning(`Quality gate failed: ${qualityResult.rejectReasons.join(', ')}`, {
          code: 'QUALITY_GATE_FAILED',
          stage: 'quality_gate',
          productId,
          severity: 'warning',
        }));

        resultBuilder.incrementFailed();
        resultBuilder.addItemResult({
          productId,
          ok: false,
          operation: 'failed',
          reason: `Quality gate failed: ${qualityResult.rejectReasons.join(', ')}`,
        });

        return resultBuilder.build('failed');
      }

      // Persist
      if (options.enablePersistence !== false) {
        const persistenceResult = await persistAffiliateAiContent(
          this.deps.affiliateContentRepository,
          {
            productId: product.id,
            contentType,
            rewrittenTitle: parsed.data.rewrittenTitle,
            reviewContent: parsed.data.reviewContent,
            socialCaption: parsed.data.socialCaption,
            hashtags: parsed.data.hashtags,
            aiModel: model,
            promptVersion,
            qualityScore: qualityResult.score,
            sourceType: product.sourceType,
            sourceKeyword: product.sourceKeyword,
          },
          { logger: this.logger }
        );

        if (persistenceResult.ok) {
          resultBuilder.incrementPersisted();
        } else {
          resultBuilder.addError(buildAiEnrichmentError(new Error(persistenceResult.error || 'Persistence failed'), {
            code: 'PERSISTENCE_ERROR',
            stage: 'persistence',
            productId,
          }));
        }
      }

      resultBuilder.incrementGenerated();

      resultBuilder.addItemResult({
        productId,
        ok: true,
        operation: 'generated',
        content: {
          rewrittenTitle: parsed.data.rewrittenTitle,
          reviewContent: parsed.data.reviewContent,
          socialCaption: parsed.data.socialCaption,
          hashtags: parsed.data.hashtags,
          qualityScore: qualityResult.score,
          qualitySeverity: qualityResult.severity,
        },
      });

      return resultBuilder.build('success');

    } catch (error) {
      const pipelineError = buildAiEnrichmentError(error, {
        code: 'PIPELINE_ERROR',
        stage: 'initialization',
        recoverable: false,
      });

      resultBuilder.addError(pipelineError);
      this.logger?.error('Pipeline failed', { productId, error: pipelineError.message });

      return resultBuilder.build('failed');
    }
  }

  /**
   * Run AI enrichment for multiple products (batch)
   */
  async runBatch(
    options: AiEnrichmentRunOptions
  ): Promise<AiEnrichmentRunResult> {
    const startTime = Date.now();
    const {
      contentType = 'affiliate_review',
      productIds,
      latestCount,
      sourceType,
      keyword,
      maxConcurrency = BATCH_CONFIG.DEFAULT_CONCURRENCY,
      promptVersion = PROMPT_CONFIG.CURRENT_AFFILIATE_REVIEW_VERSION,
      model = process.env.GEMINI_MODEL || GEMINI_CONFIG.DEFAULT_MODEL,
      temperature,
      maxTokens,
      enablePersistence = true,
      skipExisting = true,
    } = options;

    const resultBuilder = createAiEnrichmentResultBuilder({
      contentType,
      model,
      promptVersion,
      startTime,
      logger: this.logger,
    });

    try {
      this.logger?.info('Starting batch enrichment', {
        contentType,
        productIds,
        latestCount,
      });

      // Load products
      const products = await loadAffiliateProductsForEnrichment(
        this.deps.affiliateProductRepository,
        {
          productIds,
          latestCount,
          sourceType,
          keyword,
          limit: options.maxConcurrency ? options.maxConcurrency * 5 : 50,
        },
        { logger: this.logger }
      );

      resultBuilder.setLoaded(products.length);

      // Filter eligible products
      const eligibleProducts: AffiliateProductInput[] = [];
      const ineligibleProducts: Array<{ product: AffiliateProductInput; reason: string }> = [];

      for (const product of products) {
        const eligibility = buildAiEnrichmentEligibilityResult(product, { logger: this.logger });

        if (eligibility.eligible) {
          eligibleProducts.push(product);
        } else {
          ineligibleProducts.push({
            product,
            reason: eligibility.reason,
          });

          resultBuilder.addWarning(buildAiEnrichmentWarning(`Product not eligible: ${eligibility.reason}`, {
            code: 'NOT_ELIGIBLE',
            stage: 'eligibility_check',
            productId: product.id,
          }));
        }
      }

      resultBuilder.setEligible(eligibleProducts.length);

      this.logger?.info('Products loaded and filtered', {
        total: products.length,
        eligible: eligibleProducts.length,
        ineligible: ineligibleProducts.length,
      });

      // Process in batches with concurrency
      const results: AiEnrichmentItemResult[] = [];

      for (let i = 0; i < eligibleProducts.length; i += maxConcurrency) {
        const batch = eligibleProducts.slice(i, i + maxConcurrency);

        const batchPromises = batch.map(async (product) => {
          return this.processProduct(product, {
            contentType,
            promptVersion,
            model,
            temperature,
            maxTokens,
            enablePersistence,
          });
        });

        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
          results.push(result);

          if (result.operation === 'generated') {
            resultBuilder.incrementGenerated();
          } else if (result.operation === 'skipped') {
            resultBuilder.incrementSkipped();
          } else {
            resultBuilder.incrementFailed();
          }
        }

        resultBuilder.addItemResult(results[results.length - 1]);
      }

      // Build final result
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.filter(r => !r.ok).length;

      let status: 'success' | 'partial_success' | 'failed';

      if (failCount === results.length) {
        status = 'failed';
      } else if (successCount / results.length >= 0.7) {
        status = 'success';
      } else {
        status = 'partial_success';
      }

      return resultBuilder.build(status);

    } catch (error) {
      const pipelineError = buildAiEnrichmentError(error, {
        code: 'BATCH_ERROR',
        stage: 'initialization',
        recoverable: false,
      });

      resultBuilder.addError(pipelineError);
      this.logger?.error('Batch enrichment failed', { error: pipelineError.message });

      return resultBuilder.build('failed');
    }
  }

  /**
   * Process single product
   */
  private async processProduct(
    product: AffiliateProductInput,
    options: {
      contentType: AffiliateAiContentType;
      promptVersion: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
      enablePersistence: boolean;
    }
  ): Promise<AiEnrichmentItemResult> {
    const { contentType, promptVersion, model, temperature, maxTokens, enablePersistence } = options;

    try {
      // Build prompt
      const promptResult = buildAffiliateReviewPrompt(product, { version: promptVersion });

      // Create Gemini client
      const geminiClient = createGeminiClient({
        apiKey: this.deps.geminiApiKey || process.env.GEMINI_API_KEY,
        model,
        logger: this.logger,
      });

      // Call Gemini
      const request = buildGeminiContents(promptResult.systemInstruction, promptResult.userPrompt);

      const geminiResult = await geminiClient.generateContent(request, {
        temperature,
        maxTokens,
        retries: 2,
      });

      if (!geminiResult.ok || !geminiResult.text) {
        return {
          productId: product.id,
          ok: false,
          operation: 'failed',
          error: geminiResult.error || 'API call failed',
        };
      }

      // Parse
      const parsed = safeParseAffiliateContent(geminiResult.text, { logger: this.logger });

      if (!parsed.ok || !parsed.data) {
        return {
          productId: product.id,
          ok: false,
          operation: 'failed',
          error: parsed.error || 'Parse failed',
        };
      }

      // Validate
      const validation = validateAffiliateContentOutput(parsed.data);

      if (!validation.ok) {
        return {
          productId: product.id,
          ok: false,
          operation: 'failed',
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        };
      }

      // Quality gate
      const qualityResult = evaluateAffiliateAiContentQuality(parsed.data, { product }, { logger: this.logger });

      if (!qualityResult.pass) {
        return {
          productId: product.id,
          ok: false,
          operation: 'failed',
          reason: `Quality gate failed: ${qualityResult.rejectReasons.join(', ')}`,
        };
      }

      // Persist
      if (enablePersistence) {
        const persistenceResult = await persistAffiliateAiContent(
          this.deps.affiliateContentRepository,
          {
            productId: product.id,
            contentType,
            rewrittenTitle: parsed.data.rewrittenTitle,
            reviewContent: parsed.data.reviewContent,
            socialCaption: parsed.data.socialCaption,
            hashtags: parsed.data.hashtags,
            aiModel: model,
            promptVersion,
            qualityScore: qualityResult.score,
            sourceType: product.sourceType,
            sourceKeyword: product.sourceKeyword,
          },
          { logger: this.logger }
        );

        if (!persistenceResult.ok) {
          return {
            productId: product.id,
            ok: false,
            operation: 'failed',
            error: persistenceResult.error || 'Persistence failed',
          };
        }
      }

      return {
        productId: product.id,
        ok: true,
        operation: 'generated',
        content: {
          rewrittenTitle: parsed.data.rewrittenTitle,
          reviewContent: parsed.data.reviewContent,
          socialCaption: parsed.data.socialCaption,
          hashtags: parsed.data.hashtags,
          qualityScore: qualityResult.score,
          qualitySeverity: qualityResult.severity,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger?.error('Failed to process product', { productId: product.id, error: errorMessage });

      return {
        productId: product.id,
        ok: false,
        operation: 'failed',
        error: errorMessage,
      };
    }
  }
}

/**
 * Create AI enrichment pipeline
 */
export function createAffiliateAiEnrichmentPipeline(
  deps: AiEnrichmentPipelineDependencies,
  logger?: AiEnrichmentLogger
): AffiliateAiEnrichmentPipeline {
  return new AffiliateAiEnrichmentPipeline(deps, logger);
}

/**
 * Convenience function to run enrichment for single product
 */
export async function runAffiliateAiEnrichmentForProduct(
  deps: AiEnrichmentPipelineDependencies,
  productId: string,
  options?: {
    contentType?: AffiliateAiContentType;
    promptVersion?: string;
    model?: string;
    temperature?: number;
    enablePersistence?: boolean;
  },
  logger?: AiEnrichmentLogger
): Promise<AiEnrichmentRunResult> {
  const pipeline = createAffiliateAiEnrichmentPipeline(deps, logger);
  return pipeline.runForProduct(productId, options);
}

/**
 * Convenience function to run batch enrichment
 */
export async function runAffiliateAiEnrichmentBatch(
  deps: AiEnrichmentPipelineDependencies,
  options: AiEnrichmentRunOptions,
  logger?: AiEnrichmentLogger
): Promise<AiEnrichmentRunResult> {
  const pipeline = createAffiliateAiEnrichmentPipeline(deps, logger);
  return pipeline.runBatch(options);
}
