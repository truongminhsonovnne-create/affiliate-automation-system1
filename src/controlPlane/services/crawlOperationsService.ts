/**
 * Crawl Operations Service
 *
 * Handles manual crawl pipeline triggers and crawl job queries.
 */

import type {
  ControlPlaneRequestContext,
  AdminActionResult,
  ManualCrawlRequest,
  ManualSearchCrawlRequest,
  CrawlJobQueryFilters,
} from '../types.js';
import { createLogger } from '../../observability/logger/structuredLogger.js';
import { recordAdminActionSuccess, recordAdminActionFailure } from '../audit/adminAuditLogger.js';

const logger = createLogger({ subsystem: 'crawl_operations_service' });

/**
 * Trigger manual flash sale crawl
 */
export async function triggerManualFlashSaleCrawl(
  request: ManualCrawlRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Validate input
    if (!request.shopId && !request.url) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either shopId or url must be provided',
        },
        correlationId: context.correlationId,
        actionType: 'crawl.flash_sale.trigger',
      };
    }

    // TODO: Integrate with actual crawl pipeline
    // For now, return a placeholder response
    const jobId = `crawl_${Date.now().toString(36)}`;

    logger.info('Manual flash sale crawl triggered', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      shopId: request.shopId,
      url: request.url,
      jobId,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'crawl.flash_sale.trigger',
      {
        targetType: 'crawl_job',
        targetId: jobId,
        requestPayload: request,
        correlationId: context.correlationId,
        sourceIp: context.sourceIp,
        userAgent: context.userAgent,
      }
    );

    return {
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Flash sale crawl queued successfully',
        request,
      },
      correlationId: context.correlationId,
      actionType: 'crawl.flash_sale.trigger',
      targetType: 'crawl_job',
      targetId: jobId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to trigger flash sale crawl', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'crawl.flash_sale.trigger',
      error,
      { requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'crawl.flash_sale.trigger',
    };
  }
}

/**
 * Trigger manual search crawl
 */
export async function triggerManualSearchCrawl(
  request: ManualSearchCrawlRequest,
  context: ControlPlaneRequestContext
): Promise<AdminActionResult> {
  try {
    // Validate input
    if (!request.keyword || request.keyword.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Keyword is required',
          field: 'keyword',
        },
        correlationId: context.correlationId,
        actionType: 'crawl.search.trigger',
      };
    }

    const jobId = `search_${Date.now().toString(36)}`;

    logger.info('Manual search crawl triggered', {
      actorId: context.actor.id,
      correlationId: context.correlationId,
      keyword: request.keyword,
      jobId,
    });

    recordAdminActionSuccess(
      context.actor.id,
      context.actor.role,
      'crawl.search.trigger',
      {
        targetType: 'crawl_job',
        targetId: jobId,
        requestPayload: request,
        correlationId: context.correlationId,
      }
    );

    return {
      success: true,
      data: {
        jobId,
        status: 'queued',
        message: 'Search crawl queued successfully',
        request,
      },
      correlationId: context.correlationId,
      actionType: 'crawl.search.trigger',
      targetType: 'crawl_job',
      targetId: jobId,
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to trigger search crawl', error, { actorId: context.actor.id });

    recordAdminActionFailure(
      context.actor.id,
      context.actor.role,
      'crawl.search.trigger',
      error,
      { requestPayload: request, correlationId: context.correlationId }
    );

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'crawl.search.trigger',
    };
  }
}

/**
 * Get crawl jobs with filters
 */
export async function getCrawlJobs(
  filters: CrawlJobQueryFilters,
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
        actionType: 'crawl.jobs.read',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 20, 100);
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact' });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.shopId) {
      query = query.eq('shop_id', filters.shopId);
    }

    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    if (filters.until) {
      query = query.lte('created_at', filters.until);
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
      actionType: 'crawl.jobs.read',
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to get crawl jobs', error, { actorId: context.actor.id });

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'crawl.jobs.read',
    };
  }
}

/**
 * Get crawl job detail
 */
export async function getCrawlJobDetail(
  jobId: string,
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
        actionType: 'crawl.job.detail',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Crawl job '${jobId}' not found` },
        correlationId: context.correlationId,
        actionType: 'crawl.job.detail',
        targetId: jobId,
      };
    }

    return {
      success: true,
      data,
      correlationId: context.correlationId,
      actionType: 'crawl.job.detail',
      targetType: 'crawl_job',
      targetId: jobId,
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      correlationId: context.correlationId,
      actionType: 'crawl.job.detail',
    };
  }
}
