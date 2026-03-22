/**
 * Dashboard Products Read Model
 *
 * Builds read models for products with AI content and publishing readiness.
 * Matches the actual database schema for affiliate_products and affiliate_contents.
 */

import { createLogger } from '../../observability/logger/structuredLogger.js';
import type {
  ProductDashboardRecord,
  ProductDashboardDetail,
  ProductStatus,
  AiContentSummary,
  PublishJobSummary,
} from '../types.js';
import { buildPagination, buildSorting, buildDateRangeFilter } from '../query/queryBuilder.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ALLOWED_SORT_FIELDS } from '../constants.js';
import { getCachedDashboardResult, setCachedDashboardResult, CacheKeys } from '../query/cache.js';
import { CACHE_TTL_SECONDS } from '../constants.js';

const logger = createLogger({ subsystem: 'dashboard_products_read_model' });

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
 * Map database row to product dashboard record
 * Matches actual affiliate_products table schema
 */
function mapToProductRecord(row: any): ProductDashboardRecord {
  // Determine product status based on related data (AI content and publish jobs)
  // This will be enriched in the list query with additional joins if needed
  const status = determineProductStatus(row);

  return {
    id: row.id,
    externalId: row.external_product_id || '',
    source: row.source_type || '',
    shopId: row.shop_name || undefined,
    title: row.title || '',
    price: row.price ?? undefined,
    originalPrice: row.original_price ?? undefined,
    discount: row.original_price && row.price
      ? Math.round((1 - row.price / row.original_price) * 100)
      : undefined,
    thumbnailUrl: row.image_url || undefined,
    categoryId: row.category || undefined,
    categoryName: row.category || undefined,
    status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Determine product status based on database fields
 */
function determineProductStatus(row: any): ProductStatus {
  // If we have metadata about status, use it; otherwise default to pending
  if (row.status) {
    return mapToProductStatus(row.status);
  }
  return 'pending';
}

/**
 * Map database status to product status
 */
function mapToProductStatus(status?: string): ProductStatus {
  switch (status) {
    case 'enriched':
      return 'enriched';
    case 'ready':
      return 'ready';
    case 'published':
      return 'published';
    case 'failed':
      return 'failed';
    case 'archived':
      return 'archived';
    default:
      return 'pending';
  }
}

/**
 * Get product list with filters
 */
export async function getProductDashboardList(
  filters: {
    status?: string | string[];
    source?: string | string[];
    categoryId?: string;
    hasAiContent?: boolean;
    hasPublished?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    timeRange?: { start: Date; end: Date };
  },
  options?: { useCache?: boolean }
): Promise<{
  items: ProductDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.list('products', filters);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<{ items: ProductDashboardRecord[]; total: number }>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached product list');
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
      ALLOWED_SORT_FIELDS.products as any,
      { defaultField: 'created_at', defaultDirection: 'desc' }
    );
    const dateRange = filters.timeRange ? buildDateRangeFilter(undefined, undefined) : null;

    // Build base query with count
    let query = supabase
      .from('affiliate_products')
      .select('*', { count: 'exact' });

    // Apply date range filter
    if (filters.timeRange) {
      query = query
        .gte('created_at', filters.timeRange.start.toISOString())
        .lte('created_at', filters.timeRange.end.toISOString());
    }

    // Apply source_type filter (maps to 'source' in filter)
    if (filters.source) {
      const sources = Array.isArray(filters.source) ? filters.source : [filters.source];
      query = query.in('source_type', sources);
    }

    // Apply platform filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      // For products, we might filter by platform or other criteria
    }

    // Apply category filter
    if (filters.categoryId) {
      query = query.eq('category', filters.categoryId);
    }

    // Apply search on title
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`title.ilike.${searchTerm},product_url.ilike.${searchTerm}`);
    }

    // Apply sorting
    query = query.order(sorting.field, { ascending: sorting.direction === 'asc' });

    // Apply pagination
    query = query.range(pagination.offset, pagination.offset + pagination.pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data || []).map(mapToProductRecord);
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
    logger.error('Failed to get product dashboard list', err);
    return {
      items: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || DEFAULT_PAGE_SIZE,
    };
  }
}

/**
 * Get product detail with AI content and publish jobs
 */
export async function getProductDashboardDetail(
  productId: string,
  options?: { useCache?: boolean }
): Promise<ProductDashboardDetail | null> {
  const { useCache = true } = options || {};
  const cacheKey = CacheKeys.detail('product', productId);

  // Try cache first
  if (useCache) {
    const cached = getCachedDashboardResult<ProductDashboardDetail>(cacheKey);
    if (cached.hit && cached.data) {
      logger.debug('Returning cached product detail', { productId });
      return cached.data;
    }
  }

  try {
    const supabase = await getSupabaseClient();

    // Get product
    const { data: product, error: productError } = await supabase
      .from('affiliate_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      logger.warn('Product not found', { productId, error: productError });
      return null;
    }

    const record = mapToProductRecord(product);

    // Get AI content - matches actual affiliate_contents schema
    const { data: aiContents } = await supabase
      .from('affiliate_contents')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (aiContents && aiContents.length > 0) {
      const content = aiContents[0];
      record.aiContent = {
        id: content.id,
        model: content.ai_model || '',
        promptVersion: content.prompt_version || '',
        status: content.recommendation ? 'completed' : 'pending',
        qualityScore: content.confidence_score ?? undefined,
        createdAt: content.created_at,
        completedAt: undefined, // May not exist in schema
      };
    }

    // Get publish jobs - matches actual publish_jobs schema
    const { data: publishJobs } = await supabase
      .from('publish_jobs')
      .select('id, channel, status, published_at, attempt_count')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (publishJobs) {
      record.publishJobs = publishJobs.map((job) => ({
        id: job.id,
        channel: job.channel,
        status: job.status,
        publishedAt: job.published_at || undefined,
        publishedUrl: undefined, // May not exist in current schema
        attemptCount: job.attempt_count,
      }));
    }

    // Cache the result
    if (useCache) {
      setCachedDashboardResult(cacheKey, record, { ttl: CACHE_TTL_SECONDS.detail });
    }

    return record;
  } catch (err) {
    logger.error('Failed to get product dashboard detail', err, { productId });
    return null;
  }
}

/**
 * Search product dashboard records
 */
export async function searchProductDashboardRecords(
  filters: {
    query: string;
    page?: number;
    pageSize?: number;
  },
  options?: { useCache?: boolean }
): Promise<{
  items: ProductDashboardRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  return getProductDashboardList(
    {
      search: filters.query,
      page: filters.page,
      pageSize: filters.pageSize,
    },
    options
  );
}
