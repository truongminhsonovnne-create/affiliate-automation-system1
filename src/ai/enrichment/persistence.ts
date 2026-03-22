/**
 * AI Enrichment Pipeline - Persistence
 *
 * Persists AI-generated content to affiliate_contents table.
 */

import type {
  AffiliateContentRecordInput,
  AffiliateAiContentType,
  AffiliateProductInput,
  AffiliateContentOutput,
  AiPersistenceDecision,
  AiEnrichmentLogger,
} from './types.js';
import type { AffiliateContentRepository } from '../../repositories/affiliateContentRepository.js';
import { DEDUP_POLICY, PERSISTENCE_CONFIG } from './constants.js';

/**
 * Persist single AI content
 */
export async function persistAffiliateAiContent(
  repository: AffiliateContentRepository,
  input: AffiliateContentRecordInput,
  options: {
    logger?: AiEnrichmentLogger;
  } = {}
): Promise<{
  ok: boolean;
  id?: string;
  operation: 'insert' | 'update' | 'skip' | 'reject';
  reason?: string;
  error?: string;
}> {
  const { logger } = options;

  try {
    // Check for existing content
    const existing = await repository.findByProductAndType(
      input.productId,
      input.contentType
    );

    // Determine policy
    const policy = resolveAffiliateContentPersistencePolicy(
      { id: input.productId } as AffiliateProductInput,
      {
        rewrittenTitle: input.rewrittenTitle,
        reviewContent: input.reviewContent,
        socialCaption: input.socialCaption,
        hashtags: input.hashtags,
      } as AffiliateContentOutput,
      {
        promptVersion: input.promptVersion,
        aiModel: input.aiModel,
        qualityScore: input.qualityScore,
        existingContent: existing ? {
          promptVersion: existing.prompt_version,
          qualityScore: existing.quality_score,
        } : undefined,
        logger,
      }
    );

    logger?.debug('Persistence policy resolved', {
      productId: input.productId,
      action: policy.action,
      reason: policy.reason,
    });

    if (policy.action === 'skip') {
      return {
        ok: true,
        id: existing?.id,
        operation: 'skip',
        reason: policy.reason,
      };
    }

    if (policy.action === 'reject') {
      return {
        ok: false,
        operation: 'reject',
        reason: policy.reason,
      };
    }

    // Map to record
    const record = mapAiOutputToAffiliateContentRecord(
      { id: input.productId } as AffiliateProductInput,
      {
        rewrittenTitle: input.rewrittenTitle,
        reviewContent: input.reviewContent,
        socialCaption: input.socialCaption,
        hashtags: input.hashtags,
      } as AffiliateContentOutput,
      {
        contentType: input.contentType,
        aiModel: input.aiModel,
        promptVersion: input.promptVersion,
        qualityScore: input.qualityScore,
        sourceType: input.sourceType,
        sourceKeyword: input.sourceKeyword,
        existingId: existing?.id,
      }
    );

    let result;

    if (policy.action === 'insert') {
      result = await repository.create(record);
      logger?.debug('Content inserted', { id: result.id, productId: input.productId });
    } else if (policy.action === 'update' && existing?.id) {
      result = await repository.update(existing.id, record);
      logger?.debug('Content updated', { id: existing.id, productId: input.productId });
    } else {
      // Fallback to insert
      result = await repository.create(record);
    }

    return {
      ok: true,
      id: result.id,
      operation: policy.action,
      reason: policy.reason,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to persist content', {
      productId: input.productId,
      error: errorMessage,
    });

    return {
      ok: false,
      operation: 'reject',
      error: errorMessage,
    };
  }
}

/**
 * Persist multiple AI contents
 */
export async function persistManyAffiliateAiContents(
  repository: AffiliateContentRepository,
  inputs: AffiliateContentRecordInput[],
  options: {
    batchSize?: number;
    logger?: AiEnrichmentLogger;
  } = {}
): Promise<{
  ok: boolean;
  results: Array<{
    productId: string;
    ok: boolean;
    operation: 'insert' | 'update' | 'skip' | 'reject';
    id?: string;
    reason?: string;
    error?: string;
  }>;
  counters: {
    inserted: number;
    updated: number;
    skipped: number;
    rejected: number;
    failed: number;
  };
}> {
  const { batchSize = PERSISTENCE_CONFIG.DEFAULT_BATCH_SIZE, logger } = options;

  if (inputs.length === 0) {
    return {
      ok: true,
      results: [],
      counters: { inserted: 0, updated: 0, skipped: 0, rejected: 0, failed: 0 },
    };
  }

  logger?.info('Starting batch persistence', { count: inputs.length });

  const results: Array<{
    productId: string;
    ok: boolean;
    operation: 'insert' | 'update' | 'skip' | 'reject';
    id?: string;
    reason?: string;
    error?: string;
  }> = [];

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let rejected = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);

    for (const input of batch) {
      const result = await persistAffiliateAiContent(repository, input, { logger });

      results.push({
        productId: input.productId,
        ok: result.ok,
        operation: result.operation,
        id: result.id,
        reason: result.reason,
        error: result.error,
      });

      if (result.operation === 'insert') inserted++;
      else if (result.operation === 'update') updated++;
      else if (result.operation === 'skip') skipped++;
      else if (result.operation === 'reject') rejected++;
      else if (!result.ok) failed++;
    }
  }

  logger?.info('Batch persistence complete', {
    inserted,
    updated,
    skipped,
    rejected,
    failed,
  });

  return {
    ok: failed === 0 && rejected === 0,
    results,
    counters: { inserted, updated, skipped, rejected, failed },
  };
}

/**
 * Map AI output to affiliate content record
 */
export function mapAiOutputToAffiliateContentRecord(
  product: AffiliateProductInput,
  aiOutput: AffiliateContentOutput,
  options: {
    contentType: AffiliateAiContentType;
    aiModel: string;
    promptVersion: string;
    qualityScore: number;
    sourceType: string;
    sourceKeyword?: string;
    existingId?: string;
  }
): Record<string, unknown> {
  const now = new Date().toISOString();

  return {
    ...(options.existingId ? { id: options.existingId } : {}),
    product_id: product.id,
    content_type: options.contentType,
    rewritten_title: aiOutput.rewrittenTitle,
    review_content: aiOutput.reviewContent,
    social_caption: aiOutput.socialCaption,
    hashtags: aiOutput.hashtags,
    ai_model: options.aiModel,
    prompt_version: options.promptVersion,
    quality_score: options.qualityScore,
    source_type: options.sourceType,
    source_keyword: options.sourceKeyword,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Resolve persistence policy
 */
export function resolveAffiliateContentPersistencePolicy(
  product: AffiliateProductInput,
  aiOutput: AffiliateContentOutput,
  options: {
    promptVersion: string;
    aiModel: string;
    qualityScore: number;
    existingContent?: {
      promptVersion: string;
      qualityScore: number;
    };
    logger?: AiEnrichmentLogger;
  }
): {
  action: AiPersistenceDecision;
  reason: string;
} {
  const { promptVersion, aiModel, qualityScore, existingContent, logger } = options;

  // No existing content - insert
  if (!existingContent) {
    return {
      action: 'insert',
      reason: 'New content',
    };
  }

  // Check if same version and model exists
  if (
    DEDUP_POLICY.SKIP_SAME_VERSION &&
    existingContent.promptVersion === promptVersion
  ) {
    // Check quality - update if better
    if (DEDUP_POLICY.UPDATE_ON_BETTER_QUALITY) {
      const improvement = qualityScore - existingContent.qualityScore;

      if (improvement >= DEDUP_POLICY.MIN_QUALITY_IMPROVEMENT) {
        return {
          action: 'update',
          reason: `Better quality (${qualityScore} > ${existingContent.qualityScore})`,
        };
      }
    }

    return {
      action: 'skip',
      reason: 'Same prompt version already exists',
    };
  }

  // Different version - create new or update based on quality
  if (DEDUP_POLICY.CREATE_NEW_ON_MODEL_CHANGE) {
    if (DEDUP_POLICY.UPDATE_ON_BETTER_QUALITY) {
      const improvement = qualityScore - existingContent.qualityScore;

      if (improvement >= DEDUP_POLICY.MIN_QUALITY_IMPROVEMENT) {
        return {
          action: 'update',
          reason: `New version with better quality (${qualityScore} > ${existingContent.qualityScore})`,
        };
      }
    }

    // Default: insert new version
    return {
      action: 'insert',
      reason: 'New prompt version',
    };
  }

  // Default: update
  return {
    action: 'update',
    reason: 'Default update',
  };
}
