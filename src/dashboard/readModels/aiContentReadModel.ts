/**
 * Dashboard AI Content Read Model
 *
 * Builds read models for AI content with quality metrics and linked products.
 * Matches the actual affiliate_contents table schema.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  AiContentDashboardRecord,
  AiContentDashboardDetail,
  AiContentStatus,
} from '../types.js';
import { buildPagination, buildSorting, buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ALLOWED_SORT_FIELDS, DEFAULT_TIME_RANGE } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_ai_content_read_model' });

/**
 * Get Supabase client
 */
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Map database row to AI content record
 * Matches actual affiliate_contents table schema
 */
function mapToAiContentRecord(row: any, productTitle?: string): AiContentDashboardRecord {
  // Determine status based on presence of content fields
  const status = determineAiContentStatus(row);

  // Determine publish readiness
  const publishReadiness = determinePublishReadiness(row);

  return {
    id: row.id,
    productId: row.product_id,
    productTitle: productTitle || '',
    model: row.ai_model || '',
    promptVersion: row.prompt_version || '',
    status,
    qualityScore: row.confidence_score ?? undefined,
    content: undefined, // Don't expose full content in list
    errorMessage: undefined, // Not in current schema
    processingTime: undefined, // Not in current schema
    createdAt: row.created_at,
    completedAt: undefined, // Not in current schema
    updatedAt: row.created_at, // Use created_at as fallback
  };
}

/**
 * Determine AI content status based on available fields
 */
function determineAiContentStatus(row: any): AiContentStatus {
  // If we have recommendation, content has been generated
  if (row.recommendation) {
    return 'completed';
  }
  // If we have any content fields, it's processing or completed
  if (row.rewritten_title || row.review_content || row.social_caption) {
    return 'completed';
  }
  // Default to pending
  return 'pending';
}

/**
 * Determine publish readiness
 */
function determinePublishReadiness(row: any): 'ready' | 'pending_review' | 'not_ready' {
  if (!row.recommendation) {
    return 'not_ready';
  }
  // If recommendation is positive, it's ready
  if (row.recommendation === 'highly_recommended' || row.recommendation === 'recommended') {
    return 'ready';
  }
  // Otherwise needs review
  return 'pending_review';
}

/**
 * Get AI content list with filters
 */
export async function getAiContentDashboardList(
  filters: {
    status?: AiContentStatus | AiContentStatus[];
    model?: string;
    promptVersion?: string;
    hasProduct?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    timeRange?: { start: Date; end: Date };
  },
  options?: { useCache?: boolean }
): Promise<{
  items: AiContentDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.list('aiContents', filters as any);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{ items: AiContentDashboardRecord[]; total: number }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached AI content list');
      return {
        ...cached.data,
        page: filters.page || 1,
        pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
      };
    }
  }

  try {
    const supabase = await getSupabaseClient();

    const pagination = buildPagination(filters, { defaultPageSize: DEFAULT_PAGE_SIZE, maxPageSize: MAX_PAGE_SIZE });
    const sorting = buildSorting(
      { field: filters.sortField, direction: filters.sortDirection },
      ALLOWED_SORT_FIELDS.aiContents as any,
      { defaultField: 'created_at', defaultDirection: 'desc' }
    );

    // Build query - join with products to get product title
    let query = supabase
      .from('affiliate_contents')
      .select(`
        *,
        affiliate_products:product_id (title)
      `, { count: 'exact' });

    // Apply date range filter
    if (filters.timeRange) {
      query = query
        .gte('affiliate_contents.created_at', filters.timeRange.start.toISOString())
        .lte('affiliate_contents.created_at', filters.timeRange.end.toISOString());
    }

    // Apply model filter (maps to ai_model)
    if (filters.model) {
      query = query.eq('ai_model', filters.model);
    }

    // Apply prompt version filter
    if (filters.promptVersion) {
      query = query.eq('prompt_version', filters.promptVersion);
    }

    // Apply product filter
    if (filters.hasProduct !== undefined) {
      if (filters.hasProduct) {
        query = query.not('product_id', 'is', null);
      } else {
        query = query.is('product_id', null);
      }
    }

    // Apply search on product title or content ID
    if (filters.search) {
      // Note: This requires a more complex query with join
      // For simplicity, we'll search on content ID
      const searchTerm = `%${filters.search}%`;
      query = query.or(`id.ilike.${searchTerm}`);
    }

    // Apply sorting
    query = query.order(sorting.field, { ascending: sorting.direction === 'asc' });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data || []).map((row: any) => {
      const productTitle = row.affiliate_products?.title;
      return mapToAiContentRecord(row, productTitle);
    });

    const result = {
      items,
      total: count || 0,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, { items, total: count || 0 }, { ttl: CACHE_TTL_SECONDS.list });
    }

    return result;
  } catch (err) {
    logger.error('Failed to get AI content dashboard list', err);
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
    };
  }
}

/**
 * Get AI content detail with linked product
 */
export async function getAiContentDashboardDetail(
  contentId: string,
  options?: { useCache?: boolean }
): Promise<AiContentDashboardDetail | null> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.detail('aiContent', contentId);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<AiContentDashboardDetail>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached AI content detail', { contentId });
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    // Get content
    const { data: content, error: contentError } = await supabase
      .from('affiliate_contents')
      .select('*')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      logger.warn('AI content not found', { contentId, error: contentError });
      return null;
    }

    // Get linked product
    const { data: product } = await supabase
      .from('affiliate_products')
      .select('id, title, platform, price, product_url, crawled_at')
      .eq('id', content.product_id)
      .single();

    const record = mapToAiContentRecord(content, product?.title);

    // Add detailed product info if available
    if (product) {
      (record as any).linkedProduct = {
        id: product.id,
        title: product.title,
        platform: product.platform,
        price: product.price,
        productUrl: product.product_url,
        crawledAt: product.crawled_at,
        createdAt: product.crawled_at,
        updatedAt: product.crawled_at,
      };
    }

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, record, { ttl: CACHE_TTL_SECONDS.detail });
    }

    return record;
  } catch (err) {
    logger.error('Failed to get AI content dashboard detail', err, { contentId });
    return null;
  }
}

/**
 * Get AI enrichment summary
 */
export async function getAiEnrichmentSummary(
  options?: { timeRange?: { start: Date; end: Date } }
): Promise<{
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  avgQualityScore: number;
  byModel: Record<string, number>;
  byPromptVersion: Record<string, number>;
}> {
  try {
    const supabase = await getSupabaseClient();
    const timeRange = options?.timeRange || buildDateRangeFilter(DEFAULT_TIME_RANGE, undefined);

    let query = supabase
      .from('affiliate_contents')
      .select('ai_model, prompt_version, confidence_score, recommendation, rewritten_title, review_content, social_caption');

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const summary = {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      avgQualityScore: 0,
      byModel: {} as Record<string, number>,
      byPromptVersion: {} as Record<string, number>,
    };

    let totalQualityScore = 0;
    let qualityScoreCount = 0;

    for (const content of data || []) {
      summary.total++;

      // Determine status based on content presence
      const hasContent = content.rewritten_title || content.review_content || content.social_caption;
      const hasRecommendation = content.recommendation;

      if (hasRecommendation) {
        summary.completed++;
      } else if (hasContent) {
        summary.completed++;
      } else {
        summary.pending++;
      }

      if (content.ai_model) {
        summary.byModel[content.ai_model] = (summary.byModel[content.ai_model] || 0) + 1;
      }

      if (content.prompt_version) {
        summary.byPromptVersion[content.prompt_version] = (summary.byPromptVersion[content.prompt_version] || 0) + 1;
      }

      if (content.confidence_score) {
        totalQualityScore += content.confidence_score;
        qualityScoreCount++;
      }
    }

    summary.avgQualityScore = qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0;

    return summary;
  } catch (err) {
    logger.error('Failed to get AI enrichment summary', err);
    return {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      avgQualityScore: 0,
      byModel: {},
      byPromptVersion: {},
    };
  }
}
