/**
 * Dashboard Publish Jobs Service
 *
 * High-level service for dashboard publish jobs data (read + write).
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import { getPublishJobDashboardList, getPublishJobDashboardDetail, getPublishQueueSummary, getPublishFailureSummary } from '../readModels/publishJobsReadModel.js';

const logger = createLogger({ subsystem: 'dashboard_publish_jobs_service' });

/**
 * Get dashboard publish jobs
 */
export async function getDashboardPublishJobs(
  filters: {
    status?: string | string[];
    channel?: string | string[];
    priority?: number | number[];
    claimedBy?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    timeRange?: { start: Date; end: Date };
  },
  options?: { useCache?: boolean }
): Promise<{
  items: any[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}> {
  const startTime = Date.now();

  try {
    const result = await getPublishJobDashboardList(filters, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard publish jobs fetched', {
      queryTimeMs,
      count: result.items.length,
      total: result.total
    });

    return {
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasMore: result.page * result.pageSize < result.total,
      },
    };
  } catch (err) {
    logger.error('Failed to get dashboard publish jobs', err);
    throw err;
  }
}

/**
 * Get dashboard publish job detail
 */
export async function getDashboardPublishJobDetail(
  jobId: string,
  options?: { useCache?: boolean }
): Promise<any | null> {
  const startTime = Date.now();

  try {
    const result = await getPublishJobDashboardDetail(jobId, options);

    const queryTimeMs = Date.now() - startTime;
    logger.info('Dashboard publish job detail fetched', {
      queryTimeMs,
      jobId,
      found: !!result
    });

    return result;
  } catch (err) {
    logger.error('Failed to get dashboard publish job detail', err, { jobId });
    throw err;
  }
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/** Result type for create operation */
interface CreatePublishJobResult {
  success: boolean;
  data?: {
    id: string;
    platform: string;
    channel: string;
    priority: number;
    status: string;
    scheduledAt: string | null;
    productIds: string[];
    contentType: string | undefined;
    sourceType: string | undefined;
    title: string | undefined;
    description: string | undefined;
  };
  error?: { code: string; message: string };
  errorCode?: string;
}

/**
 * Create a new publish job from the admin dashboard.
 *
 * Strategy:
 *  1. If productIds are provided → create exactly one publish_jobs row per product
 *  2. If productIds are empty    → create ONE sentinel row with status='pending'
 *     and sourceType channel in payload; the worker picks up pending jobs.
 *
 * We use affiliate_products(id) as product_id FK, so we must resolve
 * product IDs to UUIDs first (or accept raw IDs if no FK enforcement needed).
 */
export async function createDashboardPublishJob(params: {
  platform: string;
  contentType?: string;
  sourceType?: string;
  productIds?: string;
  scheduledAt?: string | null;
  channel?: string;
  priority?: number;
  title?: string;
  description?: string;
  actorId?: string;
}): Promise<CreatePublishJobResult> {
  const startTime = Date.now();

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database not configured' },
        errorCode: 'DATABASE_ERROR',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const platform = params.platform;
    const channel = params.channel || 'website';
    const priority = params.priority ?? 5;
    const contentType = params.contentType;
    const sourceType = params.sourceType;
    const title = params.title;
    const description = params.description;
    const actorId = params.actorId;

    // Determine the effective scheduledAt for DB
    // - null/undefined → no scheduled_at (runs immediately via 'ready' status)
    // - ISO string     → use that timestamp
    let scheduledAt: string | null = null;
    if (params.scheduledAt !== null && params.scheduledAt !== undefined && params.scheduledAt !== '') {
      scheduledAt = new Date(params.scheduledAt).toISOString();
    }

    // If productIds provided, create one job row per product
    const productIdList = params.productIds
      ? params.productIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    // Build the base payload
    const basePayload = {
      platform,
      channel,
      contentType,
      sourceType,
      title,
      description,
    };

    // Build source_metadata for audit trail
    const baseSourceMetadata = {
      platform,
      channel,
      contentType,
      sourceType,
      title,
      description,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
      source: 'admin_dashboard',
    };

    if (productIdList.length > 0) {
      // Create one publish_jobs row per product
      const rows = productIdList.map((productId) => ({
        product_id: productId, // FK to affiliate_products — may fail if ID doesn't exist
        content_id: '00000000-0000-0000-0000-000000000000' as any, // placeholder; real content_id filled by worker
        channel,
        status: scheduledAt ? 'scheduled' : 'pending',
        scheduled_at: scheduledAt,
        priority,
        payload: JSON.stringify(basePayload),
        source_metadata: JSON.stringify(baseSourceMetadata),
      }));

      const { data, error } = await supabase
        .from('publish_jobs')
        .insert(rows)
        .select('id')
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to insert publish jobs for product IDs', error);
        return {
          success: false,
          error: { code: 'DATABASE_ERROR', message: error.message },
          errorCode: 'DATABASE_ERROR',
        };
      }

      const queryTimeMs = Date.now() - startTime;
      logger.info('Publish jobs created (per-product)', {
        queryTimeMs,
        actorId,
        platform,
        channel,
        count: data.length,
        ids: data.map((r) => r.id),
      });

      // Return first job as representative
      return {
        success: true,
        data: {
          id: data[0]?.id ?? 'unknown',
          platform,
          channel,
          priority,
          status: scheduledAt ? 'scheduled' : 'pending',
          scheduledAt,
          productIds: productIdList,
          contentType,
          sourceType,
          title,
          description,
        },
      };
    }

    // No productIds → create a sentinel pending job
    // The worker will pick this up and resolve the actual products from source/channel
    const idempotencyKey = `sentinel_${platform}_${channel}_${Date.now().toString(36)}`;

    const { data, error } = await supabase
      .from('publish_jobs')
      .insert({
        product_id: '00000000-0000-0000-0000-000000000000' as any,
        content_id: '00000000-0000-0000-0000-000000000000' as any,
        channel,
        status: scheduledAt ? 'scheduled' : 'pending',
        scheduled_at: scheduledAt,
        priority,
        payload: JSON.stringify(basePayload),
        source_metadata: JSON.stringify({
          ...baseSourceMetadata,
          isSentinel: true,
          idempotencyKey,
        }),
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (error) {
      // Handle idempotency key conflict gracefully
      if (error.code === '23505') {
        logger.warn('Duplicate sentinel publish job detected (idempotency)', { idempotencyKey });
        return {
          success: false,
          error: { code: 'DUPLICATE', message: 'A publish job for this platform and channel is already pending.' },
          errorCode: 'DUPLICATE',
        };
      }

      logger.error('Failed to insert sentinel publish job', error);
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: error.message },
        errorCode: 'DATABASE_ERROR',
      };
    }

    const queryTimeMs = Date.now() - startTime;
    logger.info('Sentinel publish job created', {
      queryTimeMs,
      actorId,
      platform,
      channel,
      scheduledAt,
      jobId: data.id,
    });

    return {
      success: true,
      data: {
        id: data.id,
        platform,
        channel,
        priority,
        status: scheduledAt ? 'scheduled' : 'pending',
        scheduledAt,
        productIds: [],
        contentType,
        sourceType,
        title,
        description,
      },
    };
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to create publish job', error, { actorId: params.actorId });
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
