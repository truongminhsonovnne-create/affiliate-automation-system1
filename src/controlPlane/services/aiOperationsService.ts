/**
 * AI Operations Service
 *
 * Handles AI enrichment triggers and content status queries.
 */

import type {
  ControlPlaneRequestContext,
  AdminActionResult,
  ManualAiEnrichmentRequest,
  BatchAiEnrichmentRequest,
} from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { recordAdminActionSuccess, recordAdminActionFailure } from '../audit/adminAuditLogger.js';

const logger = createLogger({ subsystem: 'ai_operations_service' });

/**
 * Trigger AI enrichment for a single product
 */
export async function triggerAiEnrichmentForProduct(
  request: ManualAiEnrichmentRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Validate input
    if (!request.productId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product ID is required',
          field: 'productId',
        },
        correlationId: context.correlationId,
        actionType: 'ai.enrich.product',
      };
    }

    // TODO: Integrate with actual AI enrichment pipeline
    const jobId = `ai_enrich_${Date.now().toString(36)}`;

    logger.info('AI enrichment triggered for product', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      productId: request.productId,
      jobId,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'ai.enrich.product',
      {
        targetType: 'product',
        targetId: request.productId,
        requestPayload: request,
        correlationId: context.correlationId,
        metadata: { jobId },
      }
    );

    return {
      success: true,
      data: {
        jobId,
        productId: request.productId,
        status: 'queued',
        message: 'AI enrichment queued successfully',
      },
      correlationId: context.correlationId,
      actionType: 'ai.enrich.product',
      targetType: 'product',
      targetId: request.productId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to trigger AI enrichment', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'ai.enrich.product',
      error,
      { requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'ai.enrich.product',
    };
  }
}

/**
 * Trigger batch AI enrichment
 */
export async function triggerAiEnrichmentBatch(
  request: BatchAiEnrichmentRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Validate input
    if (!request.productIds || request.productIds.length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one product ID is required',
          field: 'productIds',
        },
        correlationId: context.correlationId,
        actionType: 'ai.enrich.batch',
      };
    }

    const MAX_BATCH = 50;
    if (request.productIds.length > MAX_BATCH) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Batch size exceeds maximum of ${MAX_BATCH}`,
          field: 'productIds',
        },
        correlationId: context.correlationId,
        actionType: 'ai.enrich.batch',
      };
    }

    const batchId = `ai_batch_${Date.now().toString(36)}`;

    logger.info('Batch AI enrichment triggered', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      batchSize: request.productIds.length,
      batchId,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'ai.enrich.batch',
      {
        targetType: 'product',
        requestPayload: { ...request, count: request.productIds.length },
        correlationId: context.correlationId,
        metadata: { batchId },
      }
    );

    return {
      success: true,
      data: {
        batchId,
        count: request.productIds.length,
        status: 'queued',
        message: `Batch enrichment for ${request.productIds.length} products queued`,
      },
      correlationId: context.correlationId,
      actionType: 'ai.enrich.batch',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to trigger batch AI enrichment', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'ai.enrich.batch',
      error,
      { requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'ai.enrich.batch',
    };
  }
}

/**
 * Get AI content status
 */
export async function getAiContentStatus(
  filters: {
    productIds?: string[];
    status?: string;
    page?: number;
    pageSize?: number;
  },
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        correlationId: context.correlationId,
        actionType: 'ai.content.status',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('affiliate_contents')
      .select('*', { count: 'exact' });

    if (filters.productIds && filters.productIds.length > 0) {
      query = query.in('product_id', filters.productIds);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: {
        items: data || [],
        pagination: {
          page,
          pageSize,
          totalItems: count || 0,
          hasMore: (offset + pageSize) < (count || 0),
        },
      },
      correlationId: context.correlationId,
      actionType: 'ai.content.status',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get AI content status', error, { actorId: context.actor.id });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'ai.content.status',
    };
  }
}
